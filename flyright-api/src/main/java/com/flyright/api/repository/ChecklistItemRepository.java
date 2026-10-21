package com.flyright.api.repository;

import com.flyright.api.model.ChecklistItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository 
public interface ChecklistItemRepository extends JpaRepository<ChecklistItem, Long> {
}
