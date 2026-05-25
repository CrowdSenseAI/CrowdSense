package com.example.crowdsenseserver.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.example.crowdsenseserver.entity.InferenceTask;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;
import java.util.Map;

@Mapper
public interface InferenceTaskMapper extends BaseMapper<InferenceTask> {
    List<InferenceTask> searchByConditions(@Param("params") Map<String, Object> params);
}
