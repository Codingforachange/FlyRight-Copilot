package com.flyright.api.controller;

import com.flyright.api.model.FlightLog;
import com.flyright.api.repository.FlightLogRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/flight-logs")
@CrossOrigin(origins = "http://localhost:4200")
public class FlightLogController {

    private final FlightLogRepository flightLogRepository;

    public FlightLogController(FlightLogRepository flightLogRepository) {
        this.flightLogRepository = flightLogRepository;
    }

    @PostMapping
    public ResponseEntity<FlightLog> createFlightLog(@RequestBody FlightLog log) {
        FlightLog savedLog = flightLogRepository.save(log);
        return ResponseEntity.ok(savedLog);
    }

    @GetMapping
    public ResponseEntity<List<FlightLog>> getAllLogs() {
        return ResponseEntity.ok(flightLogRepository.findAll());
    }
}