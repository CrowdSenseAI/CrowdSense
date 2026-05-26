package com.example.crowdsenseserver.controller;

import com.example.crowdsenseserver.entity.SysUser;
import com.example.crowdsenseserver.security.JwtUtils;
import com.example.crowdsenseserver.security.UserDetailsServiceImpl;
import com.example.crowdsenseserver.service.SysUserService;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final SysUserService sysUserService;
    private final AuthenticationManager authenticationManager;
    private final JwtUtils jwtUtils;
    private final PasswordEncoder passwordEncoder;
    private final UserDetailsServiceImpl userDetailsService;

    public AuthController(SysUserService sysUserService, AuthenticationManager authenticationManager,
                          JwtUtils jwtUtils, PasswordEncoder passwordEncoder,
                          UserDetailsServiceImpl userDetailsService) {
        this.sysUserService = sysUserService;
        this.authenticationManager = authenticationManager;
        this.jwtUtils = jwtUtils;
        this.passwordEncoder = passwordEncoder;
        this.userDetailsService = userDetailsService;
    }

    @PostMapping("/login")
    public Map<String, Object> login(@RequestBody Map<String, String> loginData) {
        String username = loginData.get("username");
        String password = loginData.get("password");
        Map<String, Object> result = new HashMap<>();

        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(username, password));
            SysUser sysUser = userDetailsService.getSysUser(username);
            String token = jwtUtils.generateToken(sysUser.getId(), username, new HashMap<>());
            result.put("code", 200);
            result.put("message", "登录成功");
            Map<String, Object> data = new HashMap<>();
            data.put("token", token);
            data.put("username", username);
            data.put("realName", sysUser.getRealName());
            data.put("email", sysUser.getEmail());
            data.put("role", sysUser.getRole());
            result.put("data", data);
        } catch (Exception e) {
            result.put("code", 401);
            result.put("message", "用户名或密码错误");
        }
        return result;
    }

    @PostMapping("/register")
    public Map<String, Object> register(@RequestBody Map<String, String> registerData) {
        String username = registerData.get("username");
        String password = registerData.get("password");
        Map<String, Object> result = new HashMap<>();

        SysUser existing = userDetailsService.getSysUser(username);
        if (existing != null) {
            result.put("code", 400);
            result.put("message", "用户名已存在");
            return result;
        }

        SysUser user = new SysUser();
        user.setUsername(username);
        user.setPassword(passwordEncoder.encode(password));
        user.setRealName(registerData.getOrDefault("realName", username));
        user.setEmail(registerData.get("email"));
        user.setRole("user");
        user.setStatus(1);
        sysUserService.save(user);

        result.put("code", 200);
        result.put("message", "注册成功");
        return result;
    }

    @GetMapping("/info")
    public Map<String, Object> info() {
        Map<String, Object> result = new HashMap<>();
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            result.put("code", 401);
            result.put("message", "未登录");
            return result;
        }
        UserDetails userDetails = (UserDetails) authentication.getPrincipal();
        SysUser user = userDetailsService.getSysUser(userDetails.getUsername());
        result.put("code", 200);
        result.put("message", "success");
        Map<String, Object> data = new HashMap<>();
        data.put("id", user.getId());
        data.put("username", user.getUsername());
        data.put("realName", user.getRealName());
        data.put("email", user.getEmail());
        data.put("phone", user.getPhone());
        data.put("role", user.getRole());
        data.put("name", user.getRealName() != null ? user.getRealName() : user.getUsername());
        result.put("data", data);
        return result;
    }
}
