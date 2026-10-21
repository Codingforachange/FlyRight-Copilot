package com.flyright.api.controller;

import com.flyright.api.model.Pilot;
import com.flyright.api.repository.PilotRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/pilots")
@CrossOrigin(origins = "http://localhost:4200")
public class PilotController {

    private final PilotRepository pilotRepository;

    public PilotController(PilotRepository pilotRepository) {
        this.pilotRepository = pilotRepository;
    }

    @PostMapping("/register")
    public ResponseEntity<?> registerPilot(@RequestBody Pilot pilot) {
        if (pilotRepository.existsByEmail(pilot.getEmail())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email already registered"));
        }
        Pilot saved = pilotRepository.save(pilot);
        return ResponseEntity.ok(saved);
    }

    @PostMapping("/login")
    public ResponseEntity<?> loginPilot(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        Optional<Pilot> pilot = pilotRepository.findByEmail(email);
        if (pilot.isPresent()) {
            return ResponseEntity.ok(pilot.get());
        }
        return ResponseEntity.status(404).body(Map.of("message", "Pilot not found"));
    }
}
