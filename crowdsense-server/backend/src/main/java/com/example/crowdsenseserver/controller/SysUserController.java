package com.example.crowdsenseserver.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.example.crowdsenseserver.entity.SysUser;
import com.example.crowdsenseserver.service.SysUserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/users")
public class SysUserController {

    @Autowired
    private SysUserService sysUserService;

    @GetMapping
    public Map<String, Object> list(
            @RequestParam(defaultValue = "1") int current,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String keyword) {
        Page<SysUser> page = new Page<>(current, size);
        LambdaQueryWrapper<SysUser> wrapper = new LambdaQueryWrapper<>();
        if (keyword != null && !keyword.isEmpty()) {
            // 关键词查询条件
        }
        Page<SysUser> result = sysUserService.page(page, wrapper);
        Map<String, Object> map = new HashMap<>();
        map.put("records", result.getRecords());
        map.put("total", result.getTotal());
        return map;
    }

    @GetMapping("/{id}")
    public SysUser getById(@PathVariable Long id) {
        return sysUserService.getById(id);
    }

    @PostMapping
    public boolean save(@RequestBody SysUser sysUser) {
        return sysUserService.save(sysUser);
    }

    @PutMapping("/{id}")
    public boolean update(@PathVariable Long id, @RequestBody SysUser sysUser) {
        sysUser.setId(id);
        return sysUserService.updateById(sysUser);
    }

    @DeleteMapping("/{id}")
    public boolean delete(@PathVariable Long id) {
        return sysUserService.removeById(id);
    }
}
