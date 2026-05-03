package com.burgerbuilder.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@RestController
@RequestMapping("/api/ai")
@CrossOrigin(origins = "*")
public class AIController {

    @Value("${azure.openai.key}")
    private String apiKey;

    @Value("${azure.openai.endpoint}")
    private String endpoint;

    @Value("${azure.openai.deployment:gpt-4o-mini}")
    private String deployment;

    @PostMapping("/chat")
    public ResponseEntity<Map<String, String>> chat(@RequestBody Map<String, Object> request) {
        String userMessage = (String) request.get("message");
        Object menuItems = request.get("menuItems");

        String systemPrompt = """
            You are a friendly AI assistant for Burger Builder restaurant.
            Help customers build their perfect burger order.
            Menu items available: %s
            Keep responses short and helpful. 
            If user asks for a burger recommendation, suggest specific items from the menu.
            Always respond in the same language the user writes in.
            """.formatted(menuItems != null ? menuItems.toString() : "various burgers and ingredients");

        RestTemplate restTemplate = new RestTemplate();

        String url = endpoint + "openai/deployments/" + deployment + "/chat/completions?api-version=2024-02-15-preview";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("api-key", apiKey);

        Map<String, Object> body = new HashMap<>();
        body.put("max_tokens", 300);

        List<Map<String, String>> messages = new ArrayList<>();
        messages.add(Map.of("role", "system", "content", systemPrompt));
        messages.add(Map.of("role", "user", "content", userMessage));
        body.put("messages", messages);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);
            List<Map<String, Object>> choices = (List<Map<String, Object>>) response.getBody().get("choices");
            Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
            String reply = (String) message.get("content");
            return ResponseEntity.ok(Map.of("reply", reply));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("reply", "Sorry, I could not process your request. Please try again."));
        }
    }
}
