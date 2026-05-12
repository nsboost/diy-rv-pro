#include <Arduino.h>

void setup() {
    Serial.begin(115200);
    delay(1000);
    Serial.println("DIY RV PRO Booting...");
}

void loop() {
    static unsigned long lastHeartbeat = 0;

    if (millis() - lastHeartbeat > 5000) {
        lastHeartbeat = millis();
        Serial.println("System heartbeat OK");
    }
}
