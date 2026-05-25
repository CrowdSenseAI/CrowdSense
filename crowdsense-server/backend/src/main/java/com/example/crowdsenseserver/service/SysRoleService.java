package com.example.crowdsenseserver.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.example.crowdsenseserver.entity.SysRole;
import com.example.crowdsenseserver.mapper.SysRoleMapper;
import org.springframework.stereotype.Service;

public interface SysRoleService extends IService<SysRole> {
}

@Service
class SysRoleServiceImpl extends ServiceImpl<SysRoleMapper, SysRole> implements SysRoleService {
}
