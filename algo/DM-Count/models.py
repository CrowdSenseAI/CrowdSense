import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision import models

__all__ = ['resnet_fpn']


class ResNetFPN(nn.Module):
    """ResNet-34 + dilated convolutions + FPN neck.

    Output: density map at 1/8 input resolution (same as VGG baseline).
    Parameters: ~24M. Uses torchvision ImageNet pretrained weights.
    """

    def __init__(self):
        super().__init__()
        resnet = models.resnet34(weights=models.ResNet34_Weights.IMAGENET1K_V1)

        self.conv1 = resnet.conv1
        self.bn1 = resnet.bn1
        self.relu = resnet.relu
        self.maxpool = resnet.maxpool
        self.layer1 = resnet.layer1  # 1/4,  64ch
        self.layer2 = resnet.layer2  # 1/8, 128ch
        self.layer3 = resnet.layer3  # 1/16, 256ch
        self.layer4 = resnet.layer4  # 1/32, 512ch

        self.fusion = nn.Conv2d(960, 128, kernel_size=1)
        self.reg_layer = nn.Sequential(
            nn.Conv2d(128, 256, kernel_size=3, padding=1),
            nn.ReLU(inplace=True),
            nn.Conv2d(256, 128, kernel_size=3, padding=1),
            nn.ReLU(inplace=True),
        )
        self.density_layer = nn.Sequential(nn.Conv2d(128, 1, 1), nn.ReLU())

    def forward(self, x):
        x = self.conv1(x)
        x = self.bn1(x)
        x = self.relu(x)
        x = self.maxpool(x)          # 1/4

        l1 = self.layer1(x)          # 1/4,  64ch
        l2 = self.layer2(l1)         # 1/8, 128ch
        l3 = self.layer3(l2)         # 1/16, 256ch
        l4 = self.layer4(l3)         # 1/32, 512ch

        h, w = l2.shape[2], l2.shape[3]
        l1_d = F.interpolate(l1, size=(h, w), mode='bilinear', align_corners=False)
        l3_u = F.interpolate(l3, size=(h, w), mode='bilinear', align_corners=False)
        l4_u = F.interpolate(l4, size=(h, w), mode='bilinear', align_corners=False)

        fused = torch.cat([l1_d, l2, l3_u, l4_u], dim=1)  # 64+128+256+512=960ch

        x = self.fusion(fused)
        x = self.reg_layer(x)
        mu = self.density_layer(x)

        B, C, H, W = mu.size()
        mu_sum = mu.view([B, -1]).sum(1).unsqueeze(1).unsqueeze(2).unsqueeze(3)
        mu_normed = mu / (mu_sum + 1e-6)
        return mu, mu_normed


def resnet_fpn():
    return ResNetFPN()
