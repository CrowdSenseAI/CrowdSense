package com.example.crowdsenseserver;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;

@SpringBootApplication
@ComponentScan(basePackages = "com.example.crowdsenseserver")
@MapperScan("com.example.crowdsenseserver.mapper")
public class CrowdsenseServerApplication {
    public static void main(String[] args) {
        SpringApplication.run(CrowdsenseServerApplication.class, args);
    }
}
