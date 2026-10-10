#pragma once
// Current/future recurring rules from IANA TZif footers. Unknown zones return
// NULL; callers must not silently substitute UTC for the requested local zone.
const char *diy_timezone_posix(const char *name);
