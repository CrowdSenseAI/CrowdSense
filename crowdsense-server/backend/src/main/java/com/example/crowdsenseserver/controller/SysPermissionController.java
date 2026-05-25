package com.example.crowdsenseserver.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.example.crowdsenseserver.entity.SysPermission;
import com.example.crowdsenseserver.service.SysPermissionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/permissions")
public class SysPermissionController {

    @Autowired
    private SysPermissionService sysPermissionService;

    @GetMapping
    public Map<String, Object> list(
            @RequestParam(defaultValue = "1") int current,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String keyword) {
        Page<SysPermission> page = new Page<>(current, size);
        LambdaQueryWrapper<SysPermission> wrapper = new LambdaQueryWrapper<>();
        if (keyword != null && !keyword.isEmpty()) {
            // 关键词查询条件
        }
        Page<SysPermission> result = sysPermissionService.page(page, wrapper);
        Map<String, Object> map = new HashMap<>();
        map.put("records", result.getRecords());
        map.put("total", result.getTotal());
        return map;
    }

    @GetMapping("/{id}")
    public SysPermission getById(@PathVariable Long id) {
        return sysPermissionService.getById(id);
    }

    @PostMapping
    public boolean save(@RequestBody SysPermission sysPermission) {
        return sysPermissionService.save(sysPermission);
    }

    @PutMapping("/{id}")
    public boolean update(@PathVariable Long id, @RequestBody SysPermission sysPermission) {
        sysPermission.setId(id);
        return sysPermissionService.updateById(sysPermission);
    }

    @DeleteMapping("/{id}")
    public boolean delete(@PathVariable Long id) {
        return sysPermissionService.removeById(id);
    }
}
