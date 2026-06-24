import Testing
@testable import Ragaflow

@Suite("TimeOfDay")
struct TimeOfDayTests {

    @Test("maps hours to the correct window", arguments: [
        (5, TimeOfDay.morning), (8, .morning), (11, .morning),
        (12, .midday), (15, .midday), (16, .midday),
        (17, .evening), (19, .evening), (20, .evening),
        (21, .night), (23, .night), (0, .night), (4, .night),
    ])
    func windowForHour(hour: Int, expected: TimeOfDay) {
        #expect(TimeOfDay.current(hour: hour) == expected)
    }

    @Test("morning is a focus session labeled 'This morning'")
    func morning() {
        #expect(TimeOfDay.morning.scenario == .focus)
        #expect(TimeOfDay.morning.label == "This morning")
    }

    @Test("midday is a meditate session labeled 'A pause'")
    func midday() {
        #expect(TimeOfDay.midday.scenario == .meditate)
        #expect(TimeOfDay.midday.label == "A pause")
    }

    @Test("evening and night both wind down to sleep")
    func eveningAndNight() {
        #expect(TimeOfDay.evening.scenario == .sleep)
        #expect(TimeOfDay.evening.label == "Tonight")
        #expect(TimeOfDay.night.scenario == .sleep)
        #expect(TimeOfDay.night.label == "Wind down")
    }
}
