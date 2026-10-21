package com.flyright.api.controller;

import com.flyright.api.model.Checklist;
import com.flyright.api.model.ChecklistItem;
import com.flyright.api.repository.ChecklistRepository;
import com.flyright.api.repository.ChecklistItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.bind.annotation.RequestMethod;

import java.util.List;

@RestController 
@RequestMapping("/api/checklists")
@RequiredArgsConstructor 
public class ChecklistController {
    private final ChecklistItemRepository checklistItemRepository;
    private final ChecklistRepository checklistRepository;

    @GetMapping("/{modelCode}")
    public ResponseEntity<List<Checklist>> getChecklistsByModel(@PathVariable String modelCode) {
        java.util.List<Checklist> checklists = checklistRepository.findByAircraftModel_ModelCodeOrderBySortOrderAsc(modelCode);
        if (checklists.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(checklists);
    }
     @PatchMapping("/items/{id}")
    public ResponseEntity<ChecklistItem> toggleItemStatus(@PathVariable Long id) {
        return checklistItemRepository.findById(id)
                .map(item -> {
                    item.setIsCompleted(!Boolean.TRUE.equals(item.getIsCompleted()));
                    return ResponseEntity.ok(checklistItemRepository.save(item));
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
    @PostMapping("/reset/{modelCode}")
    public ResponseEntity<Void> resetChecklist(@PathVariable String modelCode) {
        List<Checklist> list = checklistRepository.findByAircraftModel_ModelCodeOrderBySortOrderAsc(modelCode);
        for (Checklist cl : list) {
            for (ChecklistItem item : cl.getItems()) {
                item.setIsCompleted(false);
                checklistItemRepository.save(item);
            }
        }
        return ResponseEntity.ok().build();
    }
}

