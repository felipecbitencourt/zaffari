/**
 * SCORM 1.2 API Wrapper
 * Simplifies communication with the LMS
 */

var scorm = {
    API: null,
    initialized: false,
    debug: true,

    init: function () {
        this.API = this.findAPI(window);
        if ((this.API == null) && (window.parent != null) && (window.parent != window)) {
            this.API = this.findAPI(window.parent);
        }

        if (this.API != null) {
            var result = this.API.LMSInitialize("");
            if (result == "true") {
                this.initialized = true;
                this.log("SCORM Initialized successfully.");

                // Set status to incomplete if not attempted
                var status = this.getValue("cmi.core.lesson_status");
                if (status == "not attempted") {
                    this.setValue("cmi.core.lesson_status", "incomplete");
                }
            } else {
                this.log("Failed to initialize SCORM.");
            }
        } else {
            this.log("No LMS API found. Running in standalone mode.");
        }
    },

    findAPI: function (win) {
        var findAPITries = 0;
        while ((win.API == null) && (win.parent != null) && (win.parent != win)) {
            findAPITries++;
            if (findAPITries > 7) {
                return null;
            }
            win = win.parent;
        }
        return win.API;
    },

    finish: function () {
        if (this.initialized) {
            this.API.LMSFinish("");
            this.initialized = false;
        }
    },

    getValue: function (element) {
        if (this.initialized) {
            return this.API.LMSGetValue(element);
        } else {
            // Mock data for local testing
            if (element === "cmi.core.lesson_location") return localStorage.getItem("scorm_location") || "";
            if (element === "cmi.core.lesson_status") return localStorage.getItem("scorm_status") || "not attempted";
            return "";
        }
    },

    setValue: function (element, value) {
        if (this.initialized) {
            var result = this.API.LMSSetValue(element, value);
            this.API.LMSCommit(""); // Always commit to be safe including crashes
            return result;
        } else {
            this.log("Mock Set: " + element + " = " + value);
            if (element === "cmi.core.lesson_location") localStorage.setItem("scorm_location", value);
            if (element === "cmi.core.lesson_status") localStorage.setItem("scorm_status", value);
            return "true";
        }
    },

    log: function (msg) {
        if (this.debug) {
            console.log("[SCORM]: " + msg);
        }
    }
};
