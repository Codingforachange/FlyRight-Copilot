package com.flyright.api.model;

import jakarta.persistence.*;
import lombok.*;
import java.util.ArrayList;
import java.util.List;

@Entity 
@Table(name = "checklist")
@Getter 
@Setter 
@NoArgsConstructor 
@AllArgsConstructor 
@Builder 

public class Checklist {
    @Id 
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "aircraft_model_id", nullable = false)
    private AircraftModel aircraftModel;

    @Column(nullable = false)
    private String phase; // PRE_FLIGHT, BEFORE_START, RUN_UP, BEFORE_TAKEOFF

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private Integer sortOrder;

    @OneToMany(mappedBy = "checklist", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("itemSequence ASC")
    @Builder.Default
    private List<ChecklistItem> items = new ArrayList<>();
}
