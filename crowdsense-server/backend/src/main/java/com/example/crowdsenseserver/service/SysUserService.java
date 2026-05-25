package com.example.crowdsenseserver.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.example.crowdsenseserver.entity.SysUser;
import com.example.crowdsenseserver.mapper.SysUserMapper;
import org.springframework.stereotype.Service;

public interface SysUserService extends IService<SysUser> {
}

@Service
class SysUserServiceImpl extends ServiceImpl<SysUserMapper, SysUser> implements SysUserService {
}
