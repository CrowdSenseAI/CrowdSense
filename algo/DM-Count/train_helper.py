import os
import math
import time
import torch
import torch.nn as nn
from torch import optim
from torch.utils.data import DataLoader
from torch.utils.data.dataloader import default_collate
import numpy as np
from datetime import datetime
import swanlab

from datasets.crowd import Crowd_qnrf, Crowd_nwpu, Crowd_sh
from models import resnet_fpn
from losses.ot_loss import OT_Loss
from utils.pytorch_utils import Save_Handle, AverageMeter
import utils.log_utils as log_utils


def train_collate(batch):
    transposed_batch = list(zip(*batch))
    images = torch.stack(transposed_batch[0], 0)
    points = transposed_batch[1]
    gt_discretes = torch.stack(transposed_batch[2], 0)
    return images, points, gt_discretes


class CosineWarmupScheduler:
    def __init__(self, optimizer, warmup_epochs, total_epochs,
                 base_lrs, min_lrs):
        self.optimizer = optimizer
        self.warmup_epochs = warmup_epochs
        self.total_epochs = total_epochs
        self.base_lrs = base_lrs
        self.min_lrs = min_lrs

    def step(self, epoch):
        for i, param_group in enumerate(self.optimizer.param_groups):
            if epoch < self.warmup_epochs:
                lr = self.base_lrs[i] * (epoch + 1) / max(1, self.warmup_epochs)
            else:
                progress = (epoch - self.warmup_epochs) / max(1, self.total_epochs - self.warmup_epochs)
                lr = self.min_lrs[i] + 0.5 * (self.base_lrs[i] - self.min_lrs[i]) * \
                     (1 + math.cos(math.pi * progress))
            param_group['lr'] = lr


class Trainer(object):
    def __init__(self, args):
        self.args = args
        self.current_phase = 1

    def setup(self):
        args = self.args
        sub_dir = 'input-{}_wot-{}_wtv-{}_reg-{}_nIter-{}_normCood-{}'.format(
            args.crop_size, args.wot, args.wtv, args.reg, args.num_of_iter_in_ot, args.norm_cood)

        self.save_dir = os.path.join('ckpts', sub_dir)
        if not os.path.exists(self.save_dir):
            os.makedirs(self.save_dir)

        time_str = datetime.strftime(datetime.now(), '%m%d-%H%M%S')
        self.logger = log_utils.get_logger(os.path.join(self.save_dir, 'train-{:s}.log'.format(time_str)))
        log_utils.print_config(vars(args), self.logger)

        if torch.cuda.is_available():
            self.device = torch.device("cuda")
            self.device_count = torch.cuda.device_count()
            assert self.device_count == 1
            self.logger.info('using {} gpus'.format(self.device_count))
        else:
            raise Exception("gpu is not available")

        # SwanLab will be initialized after resume detection (needs run_id for resume sync)
        self.use_swanlab = not args.no_swanlab
        self._swanlab_name = args.swanlab_name if args.swanlab_name else time_str

        downsample_ratio = 8
        if args.dataset.lower() == 'qnrf':
            self.datasets = {x: Crowd_qnrf(os.path.join(args.data_dir, x),
                                           args.crop_size, downsample_ratio, x) for x in ['train', 'val']}
        elif args.dataset.lower() == 'nwpu':
            self.datasets = {x: Crowd_nwpu(os.path.join(args.data_dir, x),
                                           args.crop_size, downsample_ratio, x) for x in ['train', 'val']}
        elif args.dataset.lower() == 'sha' or args.dataset.lower() == 'shb':
            self.datasets = {'train': Crowd_sh(os.path.join(args.data_dir, 'train_data'),
                                               args.crop_size, downsample_ratio, 'train'),
                             'val': Crowd_sh(os.path.join(args.data_dir, 'test_data'),
                                             args.crop_size, downsample_ratio, 'val'),
                             }
        else:
            raise NotImplementedError

        self.dataloaders = {x: DataLoader(self.datasets[x],
                                          collate_fn=(train_collate
                                                      if x == 'train' else default_collate),
                                          batch_size=(args.batch_size
                                                      if x == 'train' else 1),
                                          shuffle=(True if x == 'train' else False),
                                          num_workers=args.num_workers * self.device_count,
                                          pin_memory=(True if x == 'train' else False))
                            for x in ['train', 'val']}
        self.model = resnet_fpn()
        self.model.to(self.device)
        self.ot_loss = OT_Loss(args.crop_size, downsample_ratio, args.norm_cood, self.device, args.num_of_iter_in_ot,
                               args.reg)
        self.tv_loss = nn.L1Loss(reduction='none').to(self.device)
        self.mse = nn.MSELoss().to(self.device)
        self.mae = nn.L1Loss().to(self.device)
        self.save_list = Save_Handle(max_num=1)
        self.best_mae = np.inf
        self.best_mse = np.inf
        self.best_count = 0
        self.start_epoch = 0

        # Auto-detect latest checkpoint if not explicitly given and not disabled
        self.resume_optimizer_state = None
        self.resume_phase = None
        is_resume = False

        if args.resume:
            resume_path = args.resume
            is_resume = True
        elif not args.no_resume:
            resume_path = self._find_latest_checkpoint()
            if resume_path:
                is_resume = True

        if is_resume:
            self.logger.info('resuming from ' + resume_path)
            suf = resume_path.rsplit('.', 1)[-1]
            if suf == 'tar':
                checkpoint = torch.load(resume_path, self.device)
                self.model.load_state_dict(checkpoint['model_state_dict'])
                self.start_epoch = checkpoint['epoch'] + 1
                self.resume_optimizer_state = checkpoint.get('optimizer_state_dict', None)
                self.resume_phase = checkpoint.get('phase', None)
                if 'best_mae' in checkpoint:
                    self.best_mae = checkpoint['best_mae']
                    self.best_mse = checkpoint['best_mse']
                    self.best_count = checkpoint.get('best_count', 0)
                    self.logger.info('restored best_mae={:.2f}, best_mse={:.2f}'.format(
                        self.best_mae, self.best_mse))
                if self.resume_phase:
                    self.logger.info('resumed at epoch {}, phase {}'.format(
                        self.start_epoch, self.resume_phase))
            elif suf == 'pth':
                self.model.load_state_dict(torch.load(resume_path, self.device))
                self.resume_optimizer_state = None
                self.resume_phase = None
        else:
            self.logger.info('training from scratch')

        # SwanLab: read or persist run ID for resume sync
        self._swanlab_id_file = os.path.join(self.save_dir, 'swanlab_id.txt')
        if self.use_swanlab:
            swanlab_kwargs = dict(
                project=args.swanlab_project,
                experiment_name=self._swanlab_name,
                config=vars(args),
                logdir=self.save_dir,
            )
            if is_resume and os.path.exists(self._swanlab_id_file):
                with open(self._swanlab_id_file, 'r') as f:
                    run_id = f.read().strip()
                swanlab_kwargs['id'] = run_id
                swanlab_kwargs['resume'] = 'must'
                self.logger.info('swanlab resuming run {}'.format(run_id))
            run = swanlab.init(**swanlab_kwargs)
            with open(self._swanlab_id_file, 'w') as f:
                f.write(run.id)
            self.logger.info('swanlab initialized: project={}, run={}'.format(
                args.swanlab_project, run.id))

        self._setup_phase_optimizers()

    def _find_latest_checkpoint(self):
        ckpts = sorted(
            [f for f in os.listdir(self.save_dir) if f.endswith('_ckpt.tar')],
            key=lambda f: int(f.split('_')[0])
        )
        if ckpts:
            latest = os.path.join(self.save_dir, ckpts[-1])
            self.logger.info('auto-detected checkpoint: {}'.format(latest))
            return latest
        return None

    def _setup_phase_optimizers(self):
        args = self.args

        # No Phase 1 — start unfrozen, layered learning rates from epoch 0
        import itertools
        self._backbone_modules = [
            self.model.conv1, self.model.bn1,
            self.model.layer1, self.model.layer2,
            self.model.layer3, self.model.layer4
        ]
        backbone_params = itertools.chain(*[m.parameters() for m in self._backbone_modules])
        self.full_optimizer = optim.Adam([
            {'params': backbone_params,                       'lr': args.backbone_lr},
            {'params': self.model.fusion.parameters(),        'lr': args.head_lr},
            {'params': self.model.reg_layer.parameters(),     'lr': args.head_lr},
            {'params': self.model.density_layer.parameters(), 'lr': args.head_lr},
        ], lr=args.head_lr, weight_decay=args.weight_decay)

        # Restore optimizer state from checkpoint
        if self.resume_optimizer_state is not None:
            self.full_optimizer.load_state_dict(self.resume_optimizer_state)
            self.logger.info('restored optimizer state (phase {})'.format(self.resume_phase))

        # Single cosine scheduler for full training (Phase 2 + Phase 3 combined)
        total = args.max_epoch
        self.scheduler = CosineWarmupScheduler(
            self.full_optimizer,
            warmup_epochs=args.warmup_epochs,
            total_epochs=total,
            base_lrs=[args.backbone_lr, args.head_lr, args.head_lr, args.head_lr],
            min_lrs=[args.min_lr, args.min_lr, args.min_lr, args.min_lr]
        )

    def train(self):
        args = self.args
        epoch = self.start_epoch
        phase2_end = args.phase2_epochs

        if epoch < phase2_end:
            self._run_phase(2, epoch, phase2_end,
                            self.full_optimizer, self.scheduler)

        if self.start_epoch < args.max_epoch + 1:
            self.ot_ramp_step = 0
            self._run_phase(3, max(epoch, phase2_end),
                            args.max_epoch + 1,
                            self.full_optimizer, self.scheduler)

        if self.use_swanlab:
            self.logger.info('swanlab run finished')

    def _run_phase(self, phase, start_epoch, end_epoch, optimizer, scheduler):
        self.current_phase = phase
        self.optimizer = optimizer

        phase_labels = {2: 'Phase 2: MSE + Count Loss (warmup)',
                        3: 'Phase 3: Full OT Loss + Cosine Annealing'}
        self.logger.info('=== {} (Epoch {}-{}) ==='.format(
            phase_labels[phase], start_epoch, end_epoch - 1))

        if phase == 2:
            self.logger.info('backbone training from epoch 0 (no freeze)')

        for epoch in range(start_epoch, end_epoch):
            self.logger.info('-' * 5 + 'Epoch {}/{}'.format(epoch, self.args.max_epoch) + '-' * 5)
            self.epoch = epoch
            if scheduler is not None:
                scheduler.step(epoch - start_epoch)
            self.train_epoch(epoch)
            if epoch % self.args.val_epoch == 0 and epoch >= self.args.val_start:
                self.val_epoch(epoch)

    def train_epoch(self, epoch):
        epoch_ot_loss = AverageMeter()
        epoch_ot_obj_value = AverageMeter()
        epoch_wd = AverageMeter()
        epoch_count_loss = AverageMeter()
        epoch_tv_loss = AverageMeter()
        epoch_loss = AverageMeter()
        epoch_mae = AverageMeter()
        epoch_mse = AverageMeter()
        epoch_start = time.time()
        self.model.train()

        for step, (inputs, points, gt_discrete) in enumerate(self.dataloaders['train']):
            inputs = inputs.to(self.device)
            gd_count = np.array([len(p) for p in points], dtype=np.float32)
            points = [p.to(self.device) for p in points]
            gt_discrete = gt_discrete.to(self.device)
            N = inputs.size(0)

            with torch.set_grad_enabled(True):
                outputs, outputs_normed = self.model(inputs)

                if self.current_phase == 1:
                    count_loss = self.mse(outputs.sum(1).sum(1).sum(1),
                                          torch.from_numpy(gd_count).float().to(self.device))
                    epoch_count_loss.update(count_loss.item(), N)
                    loss = count_loss

                elif self.current_phase == 2:
                    count_loss = self.mae(outputs.sum(1).sum(1).sum(1),
                                          torch.from_numpy(gd_count).float().to(self.device))
                    mse_loss = self.mse(outputs.sum(1).sum(1).sum(1),
                                        torch.from_numpy(gd_count).float().to(self.device))
                    epoch_count_loss.update(count_loss.item(), N)
                    loss = mse_loss + count_loss

                elif self.current_phase == 3:
                    ramp_ratio = min(1.0, self.ot_ramp_step / max(1, self.args.ramp_ot_epochs))
                    eff_wot = self.args.wot * ramp_ratio

                    ot_loss, wd, ot_obj_value = self.ot_loss(outputs_normed, outputs, points)
                    ot_loss = ot_loss * eff_wot
                    ot_obj_value = ot_obj_value * eff_wot
                    epoch_ot_loss.update(ot_loss.item(), N)
                    epoch_ot_obj_value.update(ot_obj_value.item(), N)
                    epoch_wd.update(wd, N)

                    count_loss = self.mae(outputs.sum(1).sum(1).sum(1),
                                          torch.from_numpy(gd_count).float().to(self.device))
                    epoch_count_loss.update(count_loss.item(), N)

                    gd_count_tensor = torch.from_numpy(gd_count).float().to(self.device).unsqueeze(1).unsqueeze(2).unsqueeze(3)
                    gt_discrete_normed = gt_discrete / (gd_count_tensor + 1e-6)
                    tv_loss = (self.tv_loss(outputs_normed, gt_discrete_normed).sum(1).sum(1).sum(
                        1) * torch.from_numpy(gd_count).float().to(self.device)).mean(0) * self.args.wtv
                    epoch_tv_loss.update(tv_loss.item(), N)

                    loss = ot_loss + count_loss + tv_loss

                self.optimizer.zero_grad()
                loss.backward()
                self.optimizer.step()

                pred_count = torch.sum(outputs.view(N, -1), dim=1).detach().cpu().numpy()
                pred_err = pred_count - gd_count
                epoch_loss.update(loss.item(), N)
                epoch_mse.update(np.mean(pred_err * pred_err), N)
                epoch_mae.update(np.mean(abs(pred_err)), N)

        train_metrics = {
            'train/loss': epoch_loss.get_avg(),
            'train/mae': epoch_mae.get_avg(),
            'train/rmse': np.sqrt(epoch_mse.get_avg()),
            'train/count_loss': epoch_count_loss.get_avg(),
            'epoch': self.epoch,
            'phase': self.current_phase,
        }
        lr_val = self.optimizer.param_groups[0]['lr']
        train_metrics['train/lr'] = lr_val

        if self.current_phase == 1:
            self.logger.info(
                'Epoch {} Train, Loss: {:.2f}, MSE: {:.2f} MAE: {:.2f}, LR: {:.2e}, Cost {:.1f} sec'
                    .format(self.epoch, epoch_loss.get_avg(),
                            np.sqrt(epoch_mse.get_avg()), epoch_mae.get_avg(),
                            lr_val, time.time() - epoch_start))
        elif self.current_phase == 2:
            self.logger.info(
                'Epoch {} Train, Loss: {:.2f}, Count Loss: {:.2f}, MSE: {:.2f} MAE: {:.2f}, LR: {:.2e}, Cost {:.1f} sec'
                    .format(self.epoch, epoch_loss.get_avg(),
                            epoch_count_loss.get_avg(),
                            np.sqrt(epoch_mse.get_avg()), epoch_mae.get_avg(),
                            lr_val, time.time() - epoch_start))
        else:
            train_metrics['train/ot_loss'] = epoch_ot_loss.get_avg()
            train_metrics['train/wasserstein_dist'] = epoch_wd.get_avg()
            train_metrics['train/ot_obj_value'] = epoch_ot_obj_value.get_avg()
            train_metrics['train/tv_loss'] = epoch_tv_loss.get_avg()
            self.logger.info(
                'Epoch {} Train, Loss: {:.2f}, OT Loss: {:.2e}, Wass Distance: {:.2f}, OT obj value: {:.2f}, '
                'Count Loss: {:.2f}, TV Loss: {:.2f}, MSE: {:.2f} MAE: {:.2f}, LR: {:.2e}, Cost {:.1f} sec'
                    .format(self.epoch, epoch_loss.get_avg(), epoch_ot_loss.get_avg(), epoch_wd.get_avg(),
                            epoch_ot_obj_value.get_avg(), epoch_count_loss.get_avg(), epoch_tv_loss.get_avg(),
                            np.sqrt(epoch_mse.get_avg()), epoch_mae.get_avg(),
                            lr_val, time.time() - epoch_start))

        if self.use_swanlab:
            if self.current_phase == 3:
                train_metrics['train/ot_ramp'] = min(1.0, self.ot_ramp_step / max(1, self.args.ramp_ot_epochs))
            swanlab.log(train_metrics, step=self.epoch)

        if self.current_phase == 3:
            self.ot_ramp_step += 1

        model_state_dic = self.model.state_dict()
        save_path = os.path.join(self.save_dir, '{}_ckpt.tar'.format(self.epoch))
        torch.save({
            'epoch': self.epoch,
            'phase': self.current_phase,
            'optimizer_state_dict': self.optimizer.state_dict(),
            'model_state_dict': model_state_dic,
            'best_mae': self.best_mae,
            'best_mse': self.best_mse,
            'best_count': self.best_count,
        }, save_path)
        self.save_list.append(save_path)

    def val_epoch(self, epoch):
        args = self.args
        epoch_start = time.time()
        self.model.eval()
        epoch_res = []
        for inputs, count, name in self.dataloaders['val']:
            inputs = inputs.to(self.device)
            assert inputs.size(0) == 1, 'the batch size should equal to 1 in validation mode'
            with torch.set_grad_enabled(False):
                outputs, _ = self.model(inputs)
                res = count[0].item() - torch.sum(outputs).item()
                epoch_res.append(res)

        epoch_res = np.array(epoch_res)
        mse = np.sqrt(np.mean(np.square(epoch_res)))
        mae = np.mean(np.abs(epoch_res))
        self.logger.info('Epoch {} Val, MSE: {:.2f} MAE: {:.2f}, Cost {:.1f} sec'
                         .format(self.epoch, mse, mae, time.time() - epoch_start))

        if self.use_swanlab:
            swanlab.log({
                'val/mae': mae,
                'val/rmse': mse,
                'val/best_mae': self.best_mae,
                'val/best_rmse': self.best_mse,
                'epoch': self.epoch,
            }, step=self.epoch)

        model_state_dic = self.model.state_dict()
        if (2.0 * mse + mae) < (2.0 * self.best_mse + self.best_mae):
            self.best_mse = mse
            self.best_mae = mae
            self.logger.info("save best mse {:.2f} mae {:.2f} model epoch {}".format(self.best_mse,
                                                                                     self.best_mae,
                                                                                     self.epoch))
            torch.save(model_state_dic, os.path.join(self.save_dir, 'best_model_{}.pth'.format(self.best_count)))
            self.best_count += 1
