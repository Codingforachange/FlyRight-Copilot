package com.flyright.api.repository;

import com.flyright.api.model.AircraftModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository 

public interface AircraftModelRepository extends JpaRepository<AircraftModel, Long> {
    Optional<AircraftModel> findByModelCode(String modelCode);
}
