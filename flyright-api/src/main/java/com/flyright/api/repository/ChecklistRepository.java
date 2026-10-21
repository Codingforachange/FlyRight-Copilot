package com.flyright.api.repository;

import com.flyright.api.model.Checklist;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository

public interface ChecklistRepository extends JpaRepository<Checklist, Long>{
    List<Checklist> findByAircraftModel_ModelCodeOrderBySortOrderAsc(String modelCode);
}
