package com.example.crowdsenseserver.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.example.crowdsenseserver.entity.SysPermission;
import com.example.crowdsenseserver.mapper.SysPermissionMapper;
import org.springframework.stereotype.Service;

public interface SysPermissionService extends IService<SysPermission> {
}

@Service
class SysPermissionServiceImpl extends ServiceImpl<SysPermissionMapper, SysPermission> implements SysPermissionService {
}
