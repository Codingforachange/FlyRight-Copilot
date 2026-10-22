package com.flyright.api.config;

import com.flyright.api.model.AircraftModel;
import com.flyright.api.model.Checklist;
import com.flyright.api.model.ChecklistItem;
import com.flyright.api.repository.AircraftModelRepository;
import com.flyright.api.repository.ChecklistRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class DataSeeder implements CommandLineRunner {

    private final AircraftModelRepository aircraftModelRepo;
    private final ChecklistRepository checklistRepo;

    public DataSeeder(AircraftModelRepository aircraftModelRepo, ChecklistRepository checklistRepo) {
        this.aircraftModelRepo = aircraftModelRepo;
        this.checklistRepo = checklistRepo;
    }

    @Override
    public void run(String... args) throws Exception {
        // C172S
        AircraftModel c172 = aircraftModelRepo.findByModelCode("C172S").orElseGet(() -> 
            aircraftModelRepo.save(AircraftModel.builder()
                .modelCode("C172S")
                .name("Cessna 172 Skyhawk")
                .vrSpeedKnots(55)
                .vxSpeedKnots(62)
                .vySpeedKnots(74)
                .vfeSpeedKnots(85)
                .build())
        );

        // Cessna 152
        if (aircraftModelRepo.findByModelCode("C152").isEmpty()) {
            aircraftModelRepo.save(AircraftModel.builder()
                .modelCode("C152")
                .name("Cessna 152")
                .vrSpeedKnots(50)
                .vxSpeedKnots(55)
                .vySpeedKnots(67)
                .vfeSpeedKnots(85)
                .build());
        }

        // Piper Cherokee 140
        if (aircraftModelRepo.findByModelCode("PA28-140").isEmpty()) {
            aircraftModelRepo.save(AircraftModel.builder()
                .modelCode("PA28-140")
                .name("Piper PA-28-140 Cherokee")
                .vrSpeedKnots(55)
                .vxSpeedKnots(64)
                .vySpeedKnots(74)
                .vfeSpeedKnots(100)
                .build());
        }

        // Piper Cherokee 160
        if (aircraftModelRepo.findByModelCode("PA28-160").isEmpty()) {
            aircraftModelRepo.save(AircraftModel.builder()
                .modelCode("PA28-160")
                .name("Piper PA-28-160 Cherokee")
                .vrSpeedKnots(55)
                .vxSpeedKnots(64)
                .vySpeedKnots(75)
                .vfeSpeedKnots(100)
                .build());
        }

        // Piper Cherokee 180 Archer
        if (aircraftModelRepo.findByModelCode("PA28-180").isEmpty()) {
            aircraftModelRepo.save(AircraftModel.builder()
                .modelCode("PA28-180")
                .name("Piper PA-28-180 Archer")
                .vrSpeedKnots(55)
                .vxSpeedKnots(64)
                .vySpeedKnots(76)
                .vfeSpeedKnots(102)
                .build());
        }

        // Prevent duplicate checklist entries
        if (checklistRepo.count() > 0) {
            return;
        }

        Checklist runUp = Checklist.builder()
                .aircraftModel(c172)
                .phase("RUN_UP")
                .title("Engine Run-Up Procedures")
                .sortOrder(5)
                .build();
                
        runUp.setItems(List.of(
            ChecklistItem.builder()
                    .checklist(runUp)
                    .itemSequence(1)
                    .challenge("Throttle")
                    .response("1800 RPM")
                    .audioCue("Set throttle to 1800 RPM")
                    .build(),
                ChecklistItem.builder()
                    .checklist(runUp)
                    .itemSequence(2)
                    .challenge("Magnetos")
                    .response("Check (Max drop 125 RPM, Diff 50 RPM)")
                    .audioCue("Check Left and Right Magnetos")
                    .build(),
            ChecklistItem.builder()
                    .checklist(runUp)
                    .itemSequence(3)
                    .challenge("Carb Heat / Engine Instruments")
                    .response("CHECK & GREEN")
                    .audioCue("Verify engine gauges in the green")
                    .build(),
            ChecklistItem.builder()
                    .checklist(runUp)
                    .itemSequence(4)
                    .challenge("Throttle")
                    .response("IDLE CHECK, THEN 1000 RPM")
                    .audioCue("Idle check complete, return to 1000 RPM")
                    .build()
    ));
    checklistRepo.save(runUp);

       // Cockpit & Initial Checks
    Checklist initialChecks = Checklist.builder()
            .aircraftModel(c172)
            .phase("INITIAL_CHECKS")
            .title("Cockpit & Initial Checks")
            .sortOrder(1)
            .build();

    initialChecks.setItems(List.of(
        ChecklistItem.builder()
                .checklist(initialChecks)
                .itemSequence(1)
                .challenge("Documents & Equipment")
                .response("CHECK")
                .audioCue("Ensure airworthiness certificate, registration, operating handbook, and weight & balance data are on board. Check fire extinguisher and first aid kit.")
                .build(),
        ChecklistItem.builder()
                .checklist(initialChecks)
                .itemSequence(2)
                .challenge("Seats & Belts")
                .response("INSPECT")
                .audioCue("Secure and adjust for all occupants.")
                .build(),
        ChecklistItem.builder()
                .checklist(initialChecks)
                .itemSequence(3)
                .challenge("Circuit Breakers")
                .response("VERIFY")
                .audioCue("Verify all are in.")
                .build(),
        ChecklistItem.builder()
                .checklist(initialChecks)
                .itemSequence(4)
                .challenge("Avionics and Radios")
                .response("TURN OFF")
                .audioCue("Turn off initially; check functionality later.")
                .build(),
        ChecklistItem.builder()
                .checklist(initialChecks)
                .itemSequence(5)
                .challenge("Fuel Selector Valve")
                .response("BOTH")
                .audioCue("Set to Both.")
                .build(),
        ChecklistItem.builder()
                .checklist(initialChecks)
                .itemSequence(6)
                .challenge("Mixture")
                .response("Rich")
                .audioCue("Set to Rich.")
                .build(),
        ChecklistItem.builder()
                .checklist(initialChecks)
                .itemSequence(7)
                .challenge("Brakes")
                .response("TEST")
                .audioCue("Test and Hold.")
                .build(),
        ChecklistItem.builder()
                .checklist(initialChecks)
                .itemSequence(8)
                .challenge("Master Switch")
                .response("ON")
                .audioCue("ON for initial light and instrument checks.")
                .build()
        ));
    checklistRepo.save(initialChecks);
    
    // Pre-Flight Walkaround
    Checklist preflight = Checklist.builder()
            .aircraftModel(c172)
            .phase("PRE_FLIGHT")
            .title("Pre-Flight Walkaround")
            .sortOrder(2)
            .build();

    preflight.setItems(List.of(
        ChecklistItem.builder()
                .checklist(preflight)
                .itemSequence(1)
                .challenge("Control Wheel Lock")
                .response("REMOVED")
                .audioCue("Verify control wheel lock removed.")
                .build(),
        ChecklistItem.builder()
                .checklist(preflight)
                .itemSequence(2)
                .challenge("Ignition Switch")
                .response("OFF")
                .audioCue("Check key is removed, switch off.")
                .build(),
        ChecklistItem.builder()
                .checklist(preflight)
                .itemSequence(3)
                .challenge("Master Switch")
                .response("ON")
                .audioCue("ON for initial light and instrument checks.")
                .build(),
        ChecklistItem.builder()
                .checklist(preflight)
                .itemSequence(4)
                .challenge("Control Surfaces")
                .response("CHECK")
                .audioCue("Check control surfaces (rudder, elevator) for freedom of movement and security.")
                .build(),
        ChecklistItem.builder()
                .checklist(preflight)
                .itemSequence(5)
                .challenge("Trim tab & Hinges")
                .response("INSPECT")
                .audioCue("Inspect trim tab and hinges.")
                .build(),
        ChecklistItem.builder()
                .checklist(preflight)
                .itemSequence(6)
                .challenge("Fuselage")
                .response("INSPECT")
                .audioCue("Look for dents, cracks, or loose panels.")
                .build(),
        ChecklistItem.builder()
                .checklist(preflight)
                .itemSequence(7)
                .challenge("Lights")
                .response("INSPECT")
                .audioCue(" Landing, navigation, strobe, and taxi lights operational.")
                .build(),
        ChecklistItem.builder()
                .checklist(preflight)
                .itemSequence(8)
                .challenge("Fuel Quantity")
                .response("CHECK GAUGES")
                .audioCue("Compare gauges against stick measurment.")
                .build(),
        ChecklistItem.builder()
                .checklist(preflight)
                .itemSequence(9)
                .challenge("Pitot Tube & Stall Horn")
                .response("CHECK")
                .audioCue("Check clear and unobstructed.")
                .build(),
        ChecklistItem.builder()
                .checklist(preflight)
                .itemSequence(10)
                .challenge("Control Surfaces")
                .response("INSPECT")
                .audioCue("Ailerons and flaps move freely.")
                .build(),
        ChecklistItem.builder()
                .checklist(preflight)
                .itemSequence(11)
                .challenge("Tires, Struts, and Brakes")
                .response("INSPECT")
                .audioCue("Inspect for proper inflation, leaks, and condition")
                .build(),
        ChecklistItem.builder()
                .checklist(preflight)
                .itemSequence(12)
                .challenge("Oil Level")
                .response("INSPECT")
                .audioCue("6 - 8 quarts.")
                .build(),
        ChecklistItem.builder()
                .checklist(preflight)
                .itemSequence(13)
                .challenge("Propeller and Spinner")
                .response("INSPECT")
                .audioCue("Check for nicks or cracks.")
                .build(),
        ChecklistItem.builder()
                .checklist(preflight)
                .itemSequence(14)
                .challenge("Cowling")
                .response("INSPECT")
                .audioCue("Secure.")
                .build(),
        ChecklistItem.builder()
                .checklist(preflight)
                .itemSequence(15)
                .challenge("Alternator Belt")
                .response("INSPECT")
                .audioCue("Check tension and condition.")
                .build(),
        ChecklistItem.builder()
                .checklist(preflight)
                .itemSequence(16)
                .challenge("Air Filter")
                .response("INSPECT")
                .audioCue("Clean and unobstructed.")
                .build(),
        ChecklistItem.builder()
                .checklist(preflight)
                .itemSequence(17)
                .challenge("Fuel Lines and Hoses")
                .response("INSPECT")
                .audioCue("Inspect for leaks.")
                .build(),
        ChecklistItem.builder()
                .checklist(preflight)
                .itemSequence(18)
                .challenge("Fuel Sumps")
                .response("DRAINED & CHECKED")
                .audioCue("Check key is removed, switch off")
                .build()
    ));
    checklistRepo.save(preflight);

    // Before Takeoff
    Checklist startUp = Checklist.builder()
            .aircraftModel(c172)
            .phase("START_UP")
            .title("Start Up")
            .sortOrder(3)
            .build();

    startUp.setItems(List.of(
        ChecklistItem.builder()
                .checklist(startUp)
                .itemSequence(1)
                .challenge("Chock Blocks")
                .response("REMOVE")
                .audioCue("Remove chocks and tie-downs.")
                .build(),
        ChecklistItem.builder()
                .checklist(startUp)
                .itemSequence(2)
                .challenge("Passenger Breifing")
                .response("BRIEF")
                .audioCue("Passenger briefing completed.")
                .build(),
        ChecklistItem.builder()
                .checklist(startUp)
                .itemSequence(3)
                .challenge("Navigation")
                .response("GO OVER")
                .audioCue("Charts and navigation aids arranged.")
                .build(),
        ChecklistItem.builder()
                .checklist(startUp)
                .itemSequence(4)
                .challenge("Flight Controls")
                .response("FREE & CORRECT")
                .audioCue("Full deflection check completed")
                .build(),
        ChecklistItem.builder()
                .checklist(startUp)
                .itemSequence(5)
                .challenge("Beacon Lights")
                .response("ON")
                .audioCue("Beacon ON, other lights as required.")
                .build(),
        ChecklistItem.builder()
                .checklist(startUp)
                .itemSequence(6)
                .challenge("Avionics")
                .response("OFF")
                .audioCue("Avionics OFF until engine start.")
                .build(),
        ChecklistItem.builder()
                .checklist(startUp)
                .itemSequence(7)
                .challenge("Carb Heat")
                .response("OFF")
                .audioCue("Carb heat off.")
                .build(),
        ChecklistItem.builder()
                .checklist(startUp)
                .itemSequence(8)
                .challenge("Throttle Prep")
                .response("SET")
                .audioCue("Throttle set 1/8 inch open, carb heat OFF, prime as required.")
                .build(),
        ChecklistItem.builder()
                .checklist(startUp)
                .itemSequence(9)
                .challenge("Prop Clear")
                .response("VERIFY")
                .audioCue("Prop area visually clear, yell \"CLEAR\" before ignition")
                .build(),
        ChecklistItem.builder()
                .checklist(startUp)
                .itemSequence(10)
                .challenge("Ignition")
                .response("START")
                .audioCue("Start engine.")
                .build(),
        ChecklistItem.builder()
                .checklist(startUp)
                .itemSequence(11)
                .challenge("Throttle Set")
                .response("SET")
                .audioCue("Set to 1000 RPM.")
                .build(),
        ChecklistItem.builder()
                .checklist(startUp)
                .itemSequence(12)
                .challenge("Oil Pressure")
                .response("VERIFY")
                .audioCue("Check rising within normal range.")
                .build(),
        ChecklistItem.builder()
                .checklist(startUp)
                .itemSequence(13)
                .challenge("Ammeter")
                .response("VERIFY")
                .audioCue("Verify charging.")
                .build(),
        ChecklistItem.builder()
                .checklist(startUp)
                .itemSequence(14)
                .challenge("Flaps")
                .response("SET FOR TAKEOFF (0\u00B0 - 10\u00B0")
                .audioCue("Verify flaps set properly")
                .build(), 
        ChecklistItem.builder()
                .checklist(startUp)
                .itemSequence(15)
                .challenge("Trim")
                .response("SET TO TAKEOFF")
                .audioCue("Elevator trim set to takeoff marker")
                .build(), 
        ChecklistItem.builder()
                .checklist(startUp)
                .itemSequence(16)
                .challenge("Transponder")
                .response("ALT / ON")
                .audioCue("Transponder set to altitude reporting")
                .build(), 
        ChecklistItem.builder()
                .checklist(startUp)
                .itemSequence(17)
                .challenge("Flight Instruments")
                .response("SET")
                .audioCue("Set & verify.")
                .build(), 
        ChecklistItem.builder()
                .checklist(startUp)
                .itemSequence(18)
                .challenge("Brakes")
                .response("TEST")
                .audioCue("Release & test.")
                .build(), 
        ChecklistItem.builder()
                .checklist(startUp)
                .itemSequence(19)
                .challenge("Lights")
                .response("STROBE / LANDING ON")
                .audioCue("Full deflection check completed")
                .build()
    ));
    checklistRepo.save(startUp);

     // Taxi
    Checklist taxi = Checklist.builder()
            .aircraftModel(c172)
            .phase("TAXI")
            .title("Taxi")
            .sortOrder(4)
            .build();

    taxi.setItems(List.of(
        ChecklistItem.builder()
                .checklist(taxi)
                .itemSequence(1)
                .challenge("Taxi Call")
                .response("CALL")
                .audioCue("Announce taxi intentions on ground or CTAF.")
                .build(),
            ChecklistItem.builder()
                .checklist(taxi)
                .itemSequence(2)
                .challenge("Brakes & Steering")
                .response("CHECK")
                .audioCue("Test toe brakes, rudder steering, and instruments during roll.")
                .build()
));
    checklistRepo.save(taxi);

       // 6. Before Takeoff
        Checklist beforeTakeoff = Checklist.builder()
                .aircraftModel(c172)
                .phase("BEFORE_TAKEOFF")
                .title("Before Takeoff")
                .sortOrder(6)
                .build();

        beforeTakeoff.setItems(List.of(
                ChecklistItem.builder()
                        .checklist(beforeTakeoff)
                        .itemSequence(1)
                        .challenge("Flaps")
                        .response("SET 0° - 10°")
                        .audioCue("Set flaps for takeoff")
                        .build(),
                ChecklistItem.builder()
                        .checklist(beforeTakeoff)
                        .itemSequence(2)
                        .challenge("Trim")
                        .response("SET TAKEOFF")
                        .audioCue("Elevator trim verified for takeoff")
                        .build(),
                ChecklistItem.builder()
                        .checklist(beforeTakeoff)
                        .itemSequence(3)
                        .challenge("Transponder")
                        .response("ALT / ON")
                        .audioCue("Transponder set to altitude reporting")
                        .build(),
                ChecklistItem.builder()
                        .checklist(beforeTakeoff)
                        .itemSequence(4)
                        .challenge("Landing Lights & Strobes")
                        .response("ON")
                        .audioCue("Exterior lights illuminate active runway")
                        .build(),
                ChecklistItem.builder()
                        .checklist(beforeTakeoff)
                        .itemSequence(5)
                        .challenge("Runway & Approach")
                        .response("CLEAR")
                        .audioCue("Clear left, clear right, clear final")
                        .build(),
                ChecklistItem.builder()
                        .checklist(beforeTakeoff)
                        .itemSequence(6)
                        .challenge("Takeoff Call")
                        .response("CALL")
                        .audioCue("Announce departure on tower or CTAF frequency prior to taking active runway.")
                        .build()
        ));
        checklistRepo.save(beforeTakeoff);

        // 7. Takeoff Procedures
        Checklist takeoff = Checklist.builder()
                .aircraftModel(c172)
                .phase("TAKEOFF")
                .title("Takeoff")
                .sortOrder(7)
                .build();

        takeoff.setItems(List.of(
                ChecklistItem.builder()
                        .checklist(takeoff)
                        .itemSequence(1)
                        .challenge("Throttle")
                        .response("FULL OPEN")
                        .audioCue("Full throttle applied, verify static RPM")
                        .build(),
                ChecklistItem.builder()
                        .checklist(takeoff)
                        .itemSequence(2)
                        .challenge("Engine Instruments")
                        .response("IN THE GREEN")
                        .audioCue("Engine gauges green")
                        .build(),
                ChecklistItem.builder()
                        .checklist(takeoff)
                        .itemSequence(3)
                        .challenge("Airspeed")
                        .response("ALIVE")
                        .audioCue("Airspeed active")
                        .build(),
                ChecklistItem.builder()
                        .checklist(takeoff)
                        .itemSequence(4)
                        .challenge("Rotate")
                        .response("55 KIAS")
                        .audioCue("Rotate at 55 knots")
                        .build(),
                ChecklistItem.builder()
                        .checklist(takeoff)
                        .itemSequence(5)
                        .challenge("Climb Speed (Vy)")
                        .response("74 KIAS")
                        .audioCue("Pitch for Vy 74 knots")
                        .build()
        ));
        checklistRepo.save(takeoff);

        // 8. Pattern Procedures
        Checklist pattern = Checklist.builder()
                .aircraftModel(c172)
                .phase("PATTERN")
                .title("Pattern")
                .sortOrder(8)
                .build();

        pattern.setItems(List.of(
                ChecklistItem.builder()
                        .checklist(pattern)
                        .itemSequence(1)
                        .challenge("Crosswind Turn")
                        .response("700' AGL MINIMUM")
                        .audioCue("Clear left and right, initiate crosswind turn")
                        .build(),
                ChecklistItem.builder()
                        .checklist(pattern)
                        .itemSequence(2)
                        .challenge("Downwind")
                        .response("1000' AGL, 90 KIAS")
                        .audioCue("Level at traffic pattern altitude, 90 knots")
                        .build(),
                ChecklistItem.builder()
                        .checklist(pattern)
                        .itemSequence(3)
                        .challenge("Downwind Call")
                        .response("CALL")
                        .audioCue("Report midfield downwind, gear confirmed, touch-and-go or full stop intentions.")
                        .build(),
                ChecklistItem.builder()
                        .checklist(pattern)
                        .itemSequence(4)
                        .challenge("Abeam Numbers")
                        .response("CARB HEAT ON, 1500 RPM, FLAPS 10°")
                        .audioCue("Carb heat on, throttle 1500, extend flaps 10")
                        .build(),
                ChecklistItem.builder()
                        .checklist(pattern)
                        .itemSequence(5)
                        .challenge("Base Turn")
                        .response("70 - 75 KIAS, FLAPS 20°")
                        .audioCue("Base turn, maintain 75 knots, flaps 20")
                        .build(),
                ChecklistItem.builder()
                        .checklist(pattern)
                        .itemSequence(6)
                        .challenge("Final Turn")
                        .response("65 KIAS, FLAPS AS DESIRED")
                        .audioCue("Aligned on final, 65 knots, full flaps")
                        .build()
        ));
        checklistRepo.save(pattern);

        // 9. Landing Procedures
        Checklist landing = Checklist.builder()
                .aircraftModel(c172)
                .phase("LANDING")
                .title("Landing")
                .sortOrder(9)
                .build();

        landing.setItems(List.of(
                ChecklistItem.builder()
                        .checklist(landing)
                        .itemSequence(1)
                        .challenge("Touchdown")
                        .response("MAINS FIRST")
                        .audioCue("Flare established, touchdown mains first")
                        .build(),
                ChecklistItem.builder()
                        .checklist(landing)
                        .itemSequence(2)
                        .challenge("Brakes")
                        .response("AS REQUIRED")
                        .audioCue("Apply smooth center-line braking")
                        .build(),
                ChecklistItem.builder()
                        .checklist(landing)
                        .itemSequence(3)
                        .challenge("Runway Exit")
                        .response("CLEAR PAST HOLD LINE")
                        .audioCue("Clear active runway across the dashed hold lines")
                        .build(),
                ChecklistItem.builder()
                        .checklist(landing)
                        .itemSequence(4)
                        .challenge("Flaps")
                        .response("RETRACT")
                        .audioCue("Flaps retracted")
                        .build()
        ));
        checklistRepo.save(landing);
    }
}
