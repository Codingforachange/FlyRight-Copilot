package com.flyright.api.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "flight_logs")
public class FlightLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String pilotName;

    @Column(nullable = false)
    private String aircraftTail;

    private String flightProfile;

    private String departureIcao;

    private int compliancePercentage;

    private LocalDateTime completedAt;

    private Double totalDurationHours;

    private Integer takeoffsCount;

    private Integer landingsCount;

    public FlightLog() {
        this.completedAt = LocalDateTime.now();
    }

    public FlightLog(String pilotName, String aircraftTail, String flightProfile, String departureIcao, int compliancePercentage) {
        this.pilotName = pilotName;
        this.aircraftTail = aircraftTail;
        this.flightProfile = flightProfile;
        this.departureIcao = departureIcao;
        this.compliancePercentage = compliancePercentage;
        this.completedAt = LocalDateTime.now();
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getPilotName() { return pilotName; }
    public void setPilotName(String pilotName) { this.pilotName = pilotName; }

    public String getAircraftTail() { return aircraftTail; }
    public void setAircraftTail(String aircraftTail) { this.aircraftTail = aircraftTail; }

    public String getFlightProfile() { return flightProfile; }
    public void setFlightProfile(String flightProfile) { this.flightProfile = flightProfile; }

    public String getDepartureIcao() { return departureIcao; }
    public void setDepartureIcao(String departureIcao) { this.departureIcao = departureIcao; }

    public int getCompliancePercentage() { return compliancePercentage; }
    public void setCompliancePercentage(int compliancePercentage) { this.compliancePercentage = compliancePercentage; }

    public LocalDateTime getCompletedAt() { return completedAt; }
    public void setCompletedAt(LocalDateTime completedAt) { this.completedAt = completedAt; }

    public Double getTotalDurationHours() { return totalDurationHours; }
    public void setTotalDurationHours(Double totalDurationHours) { this.totalDurationHours = totalDurationHours;}

    public Integer getTakeoffsCount() { return takeoffsCount; }
    public void setTakeoffsCount(Integer takeoffsCount) { this.takeoffsCount = takeoffsCount;}

    public Integer getLandingsCount() { return landingsCount; }
    public void setLandingsCount(Integer landingsCount) { this.landingsCount = landingsCount;}
}