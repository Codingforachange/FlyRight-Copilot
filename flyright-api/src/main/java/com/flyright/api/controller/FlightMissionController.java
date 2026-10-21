package com.flyright.api.controller;

import com.flyright.api.model.FlightMission;
import com.flyright.api.repository.FlightMissionRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/missions")
@CrossOrigin(origins = "http://localhost:4200")
public class FlightMissionController {

    private final FlightMissionRepository flightMissionRepository;

    public FlightMissionController(FlightMissionRepository flightMissionRepository) {
        this.flightMissionRepository = flightMissionRepository;
    }

    @PostMapping
    public ResponseEntity<FlightMission> createMission(@RequestBody FlightMission mission) {
        FlightMission saved = flightMissionRepository.save(mission);
        return ResponseEntity.ok(saved);
    }

    @GetMapping("/pilot/{pilotId}")
    public ResponseEntity<List<FlightMission>> getMissionsByPilot(@PathVariable Long pilotId) {
        List<FlightMission> missions = flightMissionRepository.findByPilotIdOrderByCreatedAtDesc(pilotId);
        return ResponseEntity.ok(missions);
    }
}