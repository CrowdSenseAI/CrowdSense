"""Export trained DM-Count model to ONNX format for Java inference."""
import torch
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from models import resnet_fpn


class ExportModel(torch.nn.Module):
    """Wrapper that returns only the density map (mu), not mu_normed."""
    def __init__(self, base_model):
        super().__init__()
        self.base = base_model

    def forward(self, x):
        mu, _ = self.base(x)
        return mu


def export():
    device = torch.device('cpu')

    # Load model
    model = resnet_fpn()
    ckpt_path = os.path.join('saved_models', 'resnet_fpn_best_mae98.pth')
    model.load_state_dict(torch.load(ckpt_path, map_location=device))
    model.to(device).eval()

    export_model = ExportModel(model)

    # Export with dynamic H/W
    dummy = torch.randn(1, 3, 512, 512, device=device)

    out_dir = os.path.join('..', '..', 'crowdsense-server', 'backend', 'src', 'main', 'resources', 'models')
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, 'resnet_fpn.onnx')

    torch.onnx.export(
        export_model,
        dummy,
        out_path,
        input_names=['input'],
        output_names=['density_map'],
        dynamic_axes={
            'input': {2: 'height', 3: 'width'},
            'density_map': {2: 'height', 3: 'width'}
        },
        opset_version=11,
        do_constant_folding=True,
    )

    print(f'ONNX model exported to {out_path}')
    print(f'File size: {os.path.getsize(out_path) / 1024 / 1024:.1f} MB')

    # Verify with different input sizes
    import onnx
    onnx_model = onnx.load(out_path)
    onnx.checker.check_model(onnx_model)
    print('ONNX model checked OK')

    # Quick inference test
    import onnxruntime as ort
    import numpy as np
    session = ort.InferenceSession(out_path)
    for h, w in [(512, 512), (384, 512), (720, 1280)]:
        test_input = np.random.randn(1, 3, h, w).astype(np.float32)
        output = session.run(None, {'input': test_input})
        print(f'Input {h}x{w} → output shape {output[0].shape}')


if __name__ == '__main__':
    export()
