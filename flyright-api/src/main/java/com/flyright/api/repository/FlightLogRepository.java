package com.flyright.api.repository;

import com.flyright.api.model.FlightLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FlightLogRepository extends JpaRepository<FlightLog, Long> {
}