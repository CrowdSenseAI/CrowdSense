package com.example.crowdsenseserver.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.example.crowdsenseserver.entity.InferenceTask;
import com.example.crowdsenseserver.entity.SysUser;
import com.example.crowdsenseserver.security.UserDetailsServiceImpl;
import com.example.crowdsenseserver.service.InferenceTaskService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/inference_tasks")
public class InferenceTaskController {

    @Autowired
    private InferenceTaskService inferenceTaskService;

    @Autowired
    private UserDetailsServiceImpl userDetailsService;

    private Long getCurrentUserId() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        SysUser user = userDetailsService.getSysUser(username);
        return user.getId();
    }

    @GetMapping
    public Map<String, Object> list(
            @RequestParam(defaultValue = "1") int current,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String imageName,
            @RequestParam(required = false) String imagePath,
            @RequestParam(required = false) Integer crowdCount,
            @RequestParam(required = false) String densityPath,
            @RequestParam(required = false) Long inferenceTime,
            @RequestParam(required = false) String status) {
        Page<InferenceTask> page = new Page<>(current, size);
        LambdaQueryWrapper<InferenceTask> wrapper = new LambdaQueryWrapper<>();

        // Only return current user's tasks
        wrapper.eq(InferenceTask::getUserId, getCurrentUserId());

        if (imageName != null && !imageName.isEmpty()) {
            wrapper.like(InferenceTask::getImageName, imageName);
        }
        if (imagePath != null && !imagePath.isEmpty()) {
            wrapper.like(InferenceTask::getImagePath, imagePath);
        }
        if (crowdCount != null) {
            wrapper.eq(InferenceTask::getCrowdCount, crowdCount);
        }
        if (densityPath != null && !densityPath.isEmpty()) {
            wrapper.like(InferenceTask::getDensityPath, densityPath);
        }
        if (inferenceTime != null) {
            wrapper.eq(InferenceTask::getInferenceTime, inferenceTime);
        }
        if (status != null && !status.isEmpty()) {
            wrapper.like(InferenceTask::getStatus, status);
        }

        Page<InferenceTask> result = inferenceTaskService.page(page, wrapper);
        Map<String, Object> map = new HashMap<>();
        map.put("records", result.getRecords());
        map.put("total", result.getTotal());
        return map;
    }

    @GetMapping("/{id}")
    public InferenceTask getById(@PathVariable Long id) {
        return inferenceTaskService.getById(id);
    }

    @PostMapping
    public boolean save(@RequestBody InferenceTask inferenceTask) {
        return inferenceTaskService.save(inferenceTask);
    }

    @PutMapping("/{id}")
    public boolean update(@PathVariable Long id, @RequestBody InferenceTask inferenceTask) {
        inferenceTask.setId(id);
        return inferenceTaskService.updateById(inferenceTask);
    }

    @DeleteMapping("/{id}")
    public boolean delete(@PathVariable Long id) {
        return inferenceTaskService.removeById(id);
    }
}
