package com.flyright.api.repository;

import com.flyright.api.model.Pilot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository 
public interface PilotRepository extends JpaRepository<Pilot, Long> {
    Optional<Pilot> findByEmail(String email);
    boolean existsByEmail(String email);
}
