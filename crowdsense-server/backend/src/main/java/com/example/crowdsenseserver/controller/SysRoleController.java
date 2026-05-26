package com.example.crowdsenseserver.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.example.crowdsenseserver.entity.SysRole;
import com.example.crowdsenseserver.service.SysRoleService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/roles")
public class SysRoleController {

    @Autowired
    private SysRoleService sysRoleService;

    @GetMapping
    public Map<String, Object> list(
            @RequestParam(defaultValue = "1") int current,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String roleCode,
            @RequestParam(required = false) String roleName,
            @RequestParam(required = false) Integer status) {
        Page<SysRole> page = new Page<>(current, size);
        LambdaQueryWrapper<SysRole> wrapper = new LambdaQueryWrapper<>();
        if (roleCode != null && !roleCode.isEmpty()) {
            wrapper.like(SysRole::getRoleCode, roleCode);
        }
        if (roleName != null && !roleName.isEmpty()) {
            wrapper.like(SysRole::getRoleName, roleName);
        }
        if (status != null) {
            wrapper.eq(SysRole::getStatus, status);
        }
        Page<SysRole> result = sysRoleService.page(page, wrapper);
        Map<String, Object> map = new HashMap<>();
        map.put("records", result.getRecords());
        map.put("total", result.getTotal());
        return map;
    }

    @GetMapping("/{id}")
    public SysRole getById(@PathVariable Long id) {
        return sysRoleService.getById(id);
    }

    @PostMapping
    public boolean save(@RequestBody SysRole sysRole) {
        return sysRoleService.save(sysRole);
    }

    @PutMapping("/{id}")
    public boolean update(@PathVariable Long id, @RequestBody SysRole sysRole) {
        sysRole.setId(id);
        return sysRoleService.updateById(sysRole);
    }

    @DeleteMapping("/{id}")
    public boolean delete(@PathVariable Long id) {
        return sysRoleService.removeById(id);
    }
}
