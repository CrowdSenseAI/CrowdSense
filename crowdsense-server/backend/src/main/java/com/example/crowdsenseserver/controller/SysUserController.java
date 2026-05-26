package com.example.crowdsenseserver.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.example.crowdsenseserver.entity.InferenceTask;
import com.example.crowdsenseserver.entity.SysUser;
import com.example.crowdsenseserver.service.InferenceTaskService;
import com.example.crowdsenseserver.service.SysUserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/users")
public class SysUserController {

    @Autowired
    private SysUserService sysUserService;

    @Autowired
    private InferenceTaskService inferenceTaskService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @GetMapping
    public Map<String, Object> list(
            @RequestParam(defaultValue = "1") int current,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String username,
            @RequestParam(required = false) String realName,
            @RequestParam(required = false) String email,
            @RequestParam(required = false) String phone,
            @RequestParam(required = false) Integer status) {
        Page<SysUser> page = new Page<>(current, size);
        LambdaQueryWrapper<SysUser> wrapper = new LambdaQueryWrapper<>();
        if (username != null && !username.isEmpty()) {
            wrapper.like(SysUser::getUsername, username);
        }
        if (realName != null && !realName.isEmpty()) {
            wrapper.like(SysUser::getRealName, realName);
        }
        if (email != null && !email.isEmpty()) {
            wrapper.like(SysUser::getEmail, email);
        }
        if (phone != null && !phone.isEmpty()) {
            wrapper.like(SysUser::getPhone, phone);
        }
        if (status != null) {
            wrapper.eq(SysUser::getStatus, status);
        }
        Page<SysUser> result = sysUserService.page(page, wrapper);
        Map<String, Object> map = new HashMap<>();
        map.put("records", result.getRecords());
        map.put("total", result.getTotal());
        return map;
    }

    @GetMapping("/detection-stats")
    public Map<Long, Map<String, Object>> detectionStats() {
        List<InferenceTask> all = inferenceTaskService.list();
        Map<Long, List<InferenceTask>> grouped = all.stream()
                .collect(Collectors.groupingBy(InferenceTask::getUserId));
        Map<Long, Map<String, Object>> result = new HashMap<>();
        grouped.forEach((userId, tasks) -> {
            Map<String, Object> stats = new HashMap<>();
            stats.put("total", tasks.size());
            stats.put("success", tasks.stream().filter(t -> "SUCCESS".equals(t.getStatus())).count());
            result.put(userId, stats);
        });
        return result;
    }

    @GetMapping("/{id}")
    public SysUser getById(@PathVariable Long id) {
        return sysUserService.getById(id);
    }

    @PostMapping
    public boolean save(@RequestBody SysUser sysUser) {
        if (sysUser.getPassword() != null && !sysUser.getPassword().isEmpty()) {
            sysUser.setPassword(passwordEncoder.encode(sysUser.getPassword()));
        }
        if (sysUser.getRole() == null || sysUser.getRole().isEmpty()) {
            sysUser.setRole("user");
        }
        return sysUserService.save(sysUser);
    }

    @PutMapping("/{id}")
    public boolean update(@PathVariable Long id, @RequestBody SysUser sysUser) {
        sysUser.setId(id);
        if (sysUser.getPassword() != null && !sysUser.getPassword().isEmpty()) {
            sysUser.setPassword(passwordEncoder.encode(sysUser.getPassword()));
        }
        return sysUserService.updateById(sysUser);
    }

    @DeleteMapping("/{id}")
    public boolean delete(@PathVariable Long id) {
        return sysUserService.removeById(id);
    }
}
