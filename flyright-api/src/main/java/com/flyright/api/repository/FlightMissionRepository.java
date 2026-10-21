package com.flyright.api.repository;

import com.flyright.api.model.FlightMission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository 
public interface FlightMissionRepository extends JpaRepository<FlightMission, Long> {
    List<FlightMission> findByPilotIdOrderByCreatedAtDesc(Long pilotId);
}
