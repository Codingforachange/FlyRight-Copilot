package com.flyright.api.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity 
@Table(name = "flight_missions")
@Getter 
@Setter 
@NoArgsConstructor 
@AllArgsConstructor 
@Builder 

public class FlightMission {
    @Id 
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pilot_id", nullable = false)
    private Pilot pilot;

    @Column(nullable = false)
    private String aircraftModelCode;

    @Column(nullable = false)
    private String tailNumber;

    @Column(nullable = false)
    private String flightType; // Pattern or Cross Country

    @Column(nullable = false)
    private String departureIcao;

    private String destinationIcao;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private boolean departureTowered;

    private boolean destinationTowered;

    @PrePersist 
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
