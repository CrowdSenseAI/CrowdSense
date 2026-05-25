package com.example.crowdsenseserver.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.example.crowdsenseserver.entity.InferenceTask;
import com.example.crowdsenseserver.mapper.InferenceTaskMapper;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Map;

public interface InferenceTaskService extends IService<InferenceTask> {
    List<InferenceTask> searchByConditions(Map<String, Object> params);
}

@Service
class InferenceTaskServiceImpl extends ServiceImpl<InferenceTaskMapper, InferenceTask> implements InferenceTaskService {
    @Override
    public List<InferenceTask> searchByConditions(Map<String, Object> params) {
        return baseMapper.searchByConditions(params);
    }
}
