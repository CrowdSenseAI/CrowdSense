package com.example.crowdsenseserver.controller;

import com.example.crowdsenseserver.config.AppProperties;
import com.example.crowdsenseserver.entity.InferenceTask;
import com.example.crowdsenseserver.service.InferenceTaskService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.*;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/inference")
public class InferenceController {

    private static final Logger log = LoggerFactory.getLogger(InferenceController.class);

    private final InferenceTaskService inferenceTaskService;
    private final AppProperties appProperties;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private String baseDir;

    public InferenceController(InferenceTaskService inferenceTaskService, AppProperties appProperties) {
        this.inferenceTaskService = inferenceTaskService;
        this.appProperties = appProperties;
        this.restTemplate = new RestTemplate();
        this.objectMapper = new ObjectMapper();
    }

    @PostConstruct
    public void init() {
        this.baseDir = System.getProperty("user.dir");
    }

    @PostMapping("/upload")
    public Map<String, Object> uploadAndInfer(@RequestParam("file") MultipartFile file) {
        Map<String, Object> result = new HashMap<>();

        if (file.isEmpty()) {
            result.put("code", 400);
            result.put("message", "请选择图片文件");
            return result;
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            result.put("code", 400);
            result.put("message", "仅支持图片文件");
            return result;
        }

        // Create task record
        InferenceTask task = new InferenceTask();
        task.setImageName(file.getOriginalFilename());
        task.setStatus("PENDING");
        task.setCreateTime(LocalDateTime.now());
        task.setUpdateTime(LocalDateTime.now());
        inferenceTaskService.save(task);

        try {
            // Save uploaded image locally
            String uploadDir = appProperties.getUpload().getDir();
            Path uploadPath = resolveUploadPath(uploadDir);
            Files.createDirectories(uploadPath);
            String ext = getExtension(file.getOriginalFilename());
            String savedName = task.getId() + "_" + UUID.randomUUID().toString().substring(0, 8) + ext;
            Path imagePath = uploadPath.resolve(savedName);
            file.transferTo(imagePath.toFile());
            task.setImagePath(savedName);

            // Call Python GPU inference service
            String inferUrl = "http://127.0.0.1:8000/infer";
            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("file", new FileSystemResource(imagePath.toFile()));

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);
            HttpEntity<MultiValueMap<String, Object>> request = new HttpEntity<>(body, headers);

            ResponseEntity<String> response = restTemplate.postForEntity(inferUrl, request, String.class);
            JsonNode inferResult = objectMapper.readTree(response.getBody());

            int crowdCount = inferResult.get("crowdCount").asInt();
            long inferTime = inferResult.get("inferenceTime").asLong();
            String heatmapB64 = inferResult.get("heatmapBase64").asText();
            String densityLevel = inferResult.has("densityLevel")
                    ? inferResult.get("densityLevel").asText() : "";
            String levelTag = inferResult.has("levelTag")
                    ? inferResult.get("levelTag").asText() : "info";

            // Save density heatmap
            String densityDir = appProperties.getUpload().getDensityDir();
            Path densityPath = resolveUploadPath(densityDir);
            Files.createDirectories(densityPath);
            String dmapName = "density_" + savedName.replaceAll("\\.[^.]+$", ".png");
            Path dmapFullPath = densityPath.resolve(dmapName);
            byte[] heatmapBytes = Base64.getDecoder().decode(heatmapB64);
            Files.write(dmapFullPath, heatmapBytes);

            // Update task record
            task.setCrowdCount(crowdCount);
            task.setDensityLevel(densityLevel);
            task.setDensityPath(dmapName);
            task.setInferenceTime(inferTime);
            task.setStatus("SUCCESS");
            task.setUpdateTime(LocalDateTime.now());
            inferenceTaskService.updateById(task);

            log.info("Inference task {} completed: count={}, time={}ms", task.getId(), crowdCount, inferTime);

            result.put("code", 200);
            result.put("message", "success");
            Map<String, Object> data = new HashMap<>();
            data.put("taskId", task.getId());
            data.put("crowdCount", crowdCount);
            data.put("densityLevel", densityLevel);
            data.put("levelTag", levelTag);
            data.put("imageUrl", "/api/files/images/" + savedName);
            data.put("densityUrl", "/api/files/density/" + dmapName);
            data.put("inferenceTime", inferTime);
            result.put("data", data);

        } catch (Exception e) {
            log.error("Inference failed for task {}", task.getId(), e);
            task.setStatus("FAILED");
            task.setUpdateTime(LocalDateTime.now());
            inferenceTaskService.updateById(task);

            result.put("code", 500);
            result.put("message", "推理失败: " + e.getMessage());
        }

        return result;
    }

    private Path resolveUploadPath(String relativePath) {
        return Paths.get(baseDir, relativePath);
    }

    private String getExtension(String filename) {
        if (filename == null) return ".jpg";
        int dot = filename.lastIndexOf('.');
        return dot > 0 ? filename.substring(dot) : ".jpg";
    }
}
