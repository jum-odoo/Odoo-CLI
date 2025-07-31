(() => {
    "use strict";

    /**
     * @param {Record<string, any>} values
     */
    function formatHash(values) {
        return `#${Object.entries(values)
            .map(([key, value]) => `${key}=${value}`)
            .join("&")}`;
    }

    /**
     * @param {string} id
     * @param {string} property
     */
    function getAndBind(id, property) {
        /** @type {any} */
        const el = document.getElementById(id);
        el.addEventListener("change", function onChange(ev) {
            location.hash = formatHash({
                ...parseHash(location.hash),
                [id]: ev.currentTarget[property],
            });
        });
        return el;
    }

    function onHashChange() {
        const hashValues = parseHash(location.hash);
        if ("desktop" in hashValues) {
            desktopCheckbox.checked = hashValues.desktop;
        }
        if ("metric" in hashValues) {
            metricSelect.value = hashValues.metric;
        }
        if ("mobile" in hashValues) {
            mobileCheckbox.checked = hashValues.mobile;
        }
        if ("variance" in hashValues) {
            varianceCheckbox.checked = hashValues.variance;
        }
        update();
    }

    /**
     * @param {string} hash
     */
    function parseHash(hash) {
        if (hash.startsWith("#")) {
            hash = hash.slice(1);
        }
        /** @type {Record<string, any>} */
        const values = {};
        for (const part of hash.split("&")) {
            const [key, value] = part.split("=");
            if (!key) {
                continue;
            }
            /** @type {string | number | boolean} */
            let parsedValue = value.trim() || "true";
            if (R_TRUTHY.test(parsedValue)) {
                parsedValue = true;
            } else if (R_FALSY.test(parsedValue)) {
                parsedValue = false;
            } else if (!isNaN(Number(parsedValue))) {
                parsedValue = Number(parsedValue);
            }
            values[key.trim()] = parsedValue;
        }
        return values;
    }

    function update() {
        const desktop = desktopCheckbox.checked;
        const metric = metricSelect.value;
        const mobile = mobileCheckbox.checked;
        const variance = varianceCheckbox.checked;

        const labelPrev = {};
        const labelRefs = {};
        const labelSet = new Set();
        const datasetMap = new Map();
        for (const values of DATA) {
            if ((values.isMobile && !mobile) || (!values.isMobile && !desktop)) {
                continue;
            }
            labelSet.add(values.suite);
            let value = values[metric];
            if (metric === "time") {
                if (values.label in labelRefs) {
                    value -= labelRefs[values.label];
                } else {
                    labelRefs[values.label] = value;
                    value = 0;
                }
            }
            if (variance) {
                [value, labelPrev[values.label]] = [
                    Math.abs(value - (labelPrev[values.label] || 0)),
                    value,
                ];
            }
            if (datasetMap.has(values.label)) {
                datasetMap.get(values.label).push(value);
            } else {
                datasetMap.set(values.label, [value]);
            }
        }

        chart.data.labels = [...labelSet];
        chart.data.datasets = [...datasetMap.entries()].map(([label, data]) => ({ label, data }));
        chart.update();

        console.debug("[UPDATE]", chart.data);
    }

    const canvas = document.getElementById("myChart");

    const R_FALSY = /(false|0)/i;
    const R_TRUTHY = /(true|1)/i;

    // @ts-ignore
    const DATA = window.LOG_DATA || [];
    // @ts-ignore
    const chart = new Chart(canvas, {
        type: "line",
        data: {},
        options: {
            elements: {
                line: { borderWidth: 1 },
                point: { radius: 1 },
            },
            plugins: {
                zoom: {
                    zoom: {
                        wheel: { enabled: true },
                        pinch: { enabled: true },
                        mode: "x",
                    },
                },
            },
        },
    });

    /** @type {HTMLInputElement} */
    const desktopCheckbox = getAndBind("desktop", "checked");
    /** @type {HTMLSelectElement} */
    const metricSelect = getAndBind("metric", "value");
    /** @type {HTMLInputElement} */
    const mobileCheckbox = getAndBind("mobile", "checked");
    /** @type {HTMLInputElement} */
    const varianceCheckbox = getAndBind("variance", "checked");

    window.addEventListener("hashchange", onHashChange);

    onHashChange();
})();
