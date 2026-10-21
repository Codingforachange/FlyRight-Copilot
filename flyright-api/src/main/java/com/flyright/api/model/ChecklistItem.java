package com.flyright.api.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

@Entity 
@Table(name = "checklist_items")
@Getter 
@Setter 
@NoArgsConstructor 
@AllArgsConstructor 
@Builder 

public class ChecklistItem {
    @Id 
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "checklist_id", nullable = false)
    @JsonIgnore 
    private Checklist checklist;

    @Column(nullable = false)
    private Integer itemSequence;

    @Column(nullable = false)
    private String challenge; // e.g., "Throttle", "Magnetos"

    @Column(nullable = false)
    private String response;// e.g., "1800 RPM", "Check (Max drop 125 RPM"

    @Column(nullable = false)
    @Builder.Default
    private Boolean isCompleted =false;

    private String audioCue; // Browser Web Speech cue

}
