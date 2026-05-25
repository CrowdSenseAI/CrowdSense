package com.example.crowdsenseserver.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app")
public class AppProperties {
    private Upload upload = new Upload();
    private Model model = new Model();

    public Upload getUpload() { return upload; }
    public void setUpload(Upload upload) { this.upload = upload; }
    public Model getModel() { return model; }
    public void setModel(Model model) { this.model = model; }

    public static class Upload {
        private String dir = "uploads/images";
        private String densityDir = "uploads/density";

        public String getDir() { return dir; }
        public void setDir(String dir) { this.dir = dir; }
        public String getDensityDir() { return densityDir; }
        public void setDensityDir(String densityDir) { this.densityDir = densityDir; }
    }

    public static class Model {
        private String path = "classpath:models/resnet_fpn.onnx";

        public String getPath() { return path; }
        public void setPath(String path) { this.path = path; }
    }
}
