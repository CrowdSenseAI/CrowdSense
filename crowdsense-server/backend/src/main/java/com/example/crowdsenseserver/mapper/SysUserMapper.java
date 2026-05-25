package com.example.crowdsenseserver.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.example.crowdsenseserver.entity.SysUser;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface SysUserMapper extends BaseMapper<SysUser> {
}
