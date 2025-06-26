(() => {
    "use strict";

    const canvas = document.getElementById("myChart");
    // @ts-ignore
    const data = window.LOG_DATA || [];
    const datasets = Object.keys(data[0])
        .filter((key) => key !== "suite")
        .map((build) => ({
            label: build,
            data: Object.values(data).map((d) => parseInt(d[build])),
        }));
    // @ts-ignore
    new Chart(canvas, {
        type: "line",
        data: {
            labels: data.map((d) => d.suite),
            datasets,
        },
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
})();
