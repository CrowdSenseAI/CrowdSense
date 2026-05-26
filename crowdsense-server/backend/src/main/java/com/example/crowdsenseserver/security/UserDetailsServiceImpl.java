package com.example.crowdsenseserver.security;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.example.crowdsenseserver.entity.SysUser;
import com.example.crowdsenseserver.service.SysUserService;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class UserDetailsServiceImpl implements UserDetailsService {

    private final SysUserService sysUserService;

    public UserDetailsServiceImpl(SysUserService sysUserService) {
        this.sysUserService = sysUserService;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        LambdaQueryWrapper<SysUser> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(SysUser::getUsername, username);
        SysUser user = sysUserService.getOne(wrapper);
        if (user == null) {
            throw new UsernameNotFoundException("用户不存在: " + username);
        }
        List<SimpleGrantedAuthority> authorities = List.of(
                new SimpleGrantedAuthority("ROLE_" + (user.getRole() != null ? user.getRole().toUpperCase() : "USER"))
        );
        return User.builder()
                .username(user.getUsername())
                .password(user.getPassword())
                .disabled(user.getStatus() != null && user.getStatus() == 0)
                .authorities(authorities)
                .build();
    }

    public SysUser getSysUser(String username) {
        LambdaQueryWrapper<SysUser> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(SysUser::getUsername, username);
        return sysUserService.getOne(wrapper);
    }
}
