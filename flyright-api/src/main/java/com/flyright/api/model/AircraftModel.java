package com.flyright.api.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "aircraft_models")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder

public class AircraftModel {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String modelCode; //e.g., "C172S"

    @Column(nullable = false)
    private String name; // e.g., "Cessna 172 Skyhawk"
    
    private Integer vrSpeedKnots; // 55 KIAS
    private Integer vxSpeedKnots; // 62 KIAS
    private Integer vySpeedKnots; // 74 KIAS
    private Integer vfeSpeedKnots; // 85 KIAS
}
