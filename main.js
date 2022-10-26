// Manually register GSAP DirectionalRotation plugin
gsap.registerPlugin({
    name: "directionalRotation",
    init(target, values) {
        if (typeof (values) !== "object") {
            values = { rotation: values };
        }
        var data = this,
            cap = values.useRadians ? Math.PI * 2 : 360,
            min = 1e-6,
            p, v, start, end, dif, split;
        data.endValues = {};
        data.target = target;
        for (p in values) {
            if (p !== "useRadians") {
                end = values[p];
                split = (end + "").split("_");
                v = split[0];
                start = parseFloat(target[p]);
                end = data.endValues[p] = (typeof (v) === "string" && v.charAt(1) === "=") ? start + parseInt(v.charAt(0) + "1", 10) * Number(v.substr(2)) : +v || 0;
                dif = end - start;
                if (split.length) {
                    v = split.join("_");
                    if (~v.indexOf("short")) {
                        dif = dif % cap;
                        if (dif !== dif % (cap / 2)) {
                            dif = (dif < 0) ? dif + cap : dif - cap;
                        }
                    }
                    if (v.indexOf("_cw") !== -1 && dif < 0) {
                        dif = ((dif + cap * 1e10) % cap) - ((dif / cap) | 0) * cap;
                    } else if (v.indexOf("ccw") !== -1 && dif > 0) {
                        dif = ((dif - cap * 1e10) % cap) - ((dif / cap) | 0) * cap;
                    }
                }
                if (dif > min || dif < -min) {
                    data.add(target, p, start, start + dif);
                    data._props.push(p);
                }
            }
        }
    },
    render(progress, data) {
        if (progress === 1) {
            for (let p in data.endValues) {
                data.target[p] = data.endValues[p];
            }
        } else {
            let pt = data._pt;
            while (pt) {
                pt.r(progress, pt.d);
                pt = pt._next;
            }
        }
    }
});

let introtl = gsap.timeline({
    scrollTrigger: {
        trigger: "#intro",
        pin: true,
        start: "top top",
        end: "+=150%",
        scrub: true
    },
});

// Animate intro section
introtl.from("#leftTri1, #rightTri1, #leftTri2, #rightTri2, #leftTri3, #rightTri3", {
    width: '101%',
    height: '101%'
}).from("#introText", {
    scale: '0.7'
}, 0);

window.onload = function () {
    const phi = Math.PI * (3 - Math.sqrt(5));
    let rotation = { x: 0, y: 0, z: 0, xForce: 0, yForce: 0, zForce: 0 };
    let cloud = document.getElementById("skillsCloud");
    let cloudObjects = Array.prototype.map.call(cloud.children, child => { return { element: child } });
    let maxWidth = 0;
    let maxHeight = 0;

    cloudObjects.forEach((object, index) => {
        if (object.element.clientWidth > maxWidth) {
            maxWidth = object.element.clientWidth;
        }
        if (object.element.clientHeight > maxHeight) {
            maxHeight = object.element.clientHeight;
        }

        // Set position of objects using fibonacci sphere
        object.y = 1 - (index / (cloudObjects.length - 1)) * 2;

        radius = Math.sqrt(1 - object.y * object.y);
        theta = phi * index;

        object.x = Math.cos(theta) * radius;
        object.z = Math.sin(theta) * radius;
    });

    let prevTimestamp = 0;

    // Animate skills cloud
    let cloudtl = gsap.timeline({ repeat: -1, repeatRefresh: true });
    cloudtl.to(rotation, { xForce: "random(0.1, 0.2)", yForce: "random(0.1, 0.2)", zForce: "random(0, 0.1)", duration: 2, ease: "power2.inOut" });

    function drawCloud(timestamp) {
        if (prevTimestamp == 0) {
            prevTimestamp = timestamp;
        }

        let elapsed = timestamp - prevTimestamp;
        if (elapsed > 0) {
            // Rotate objects
            if (cloudtl.isActive()) {
                rotation.x += rotation.xForce * elapsed * 0.002;
                rotation.y += rotation.yForce * elapsed * 0.002;
                rotation.z += rotation.zForce * elapsed * 0.002;
            }

            // Draw objects
            cloudObjects.forEach(object => {
                let rotatedPoint = rotate(object, rotation.x, rotation.y, rotation.z);

                let point = {
                    x: (rotatedPoint.x + 1) / 2,
                    y: (rotatedPoint.y + 1) / 2,
                    z: (((rotatedPoint.z + 1) / 2) * 0.8) + 0.2
                }

                object.element.style.transform = `translate(${(point.x * (cloud.clientWidth - maxWidth)) - (object.element.clientWidth / 2) + (maxWidth / 2)}px, ${(point.y * (cloud.clientHeight - maxHeight)) - (object.element.clientHeight / 2) + (maxHeight / 2)}px) scale(${point.z})`;
                object.element.style.opacity = point.z;
                object.element.style.zIndex = Math.round(point.z * 100);
            });
        }

        prevTimestamp = timestamp;
        window.requestAnimationFrame(drawCloud);
    }

    // Rotate a point around the x and y axis
    function rotate(point, angleX, angleY, angleZ) {
        // Rotate around x axis
        let rotated1 = {
            x: point.x,
            y: (point.y * Math.cos(angleX)) + (point.z * -Math.sin(angleX)),
            z: (point.y * Math.sin(angleX)) + (point.z * Math.cos(angleX))
        }

        // Rotate around z axis
        let rotated2 = {
            x: (rotated1.x * Math.cos(angleZ)) + (rotated1.y * -Math.sin(angleZ)),
            y: (rotated1.x * Math.sin(angleZ)) + (rotated1.y * Math.cos(angleZ)),
            z: rotated1.z
        }

        // Rotate around y axis
        let rotated3 = {
            x: (rotated2.x * Math.cos(angleY)) + (rotated2.z * Math.sin(angleY)),
            y: rotated2.y,
            z: (rotated2.x * -Math.sin(angleY)) + (rotated2.z * Math.cos(angleY))
        }

        return rotated3;
    }

    window.requestAnimationFrame(drawCloud);

    // Rotate to skill on hover
    document.querySelectorAll("span[data-skill]").forEach(element => {
        element.addEventListener("mouseenter", () => {
            cloudtl.pause();
            document.getElementById(element.dataset.skill).classList.add("selected");
            rotation.x = rotation.x % (Math.PI * 2);
            rotation.y = rotation.y % (Math.PI * 2);
            rotation.z = rotation.z % (Math.PI * 2);

            // Rotate to selected skill
            let skillObj = cloudObjects.find(object => object.element.id == element.dataset.skill);
            gsap.to(rotation, {
                directionalRotation: {
                    x: `${0}_short`,
                    y: `${(Math.PI * 2) - Math.acos(skillObj.z)}_short`,
                    z: `${(Math.PI * 2) - Math.atan2(skillObj.y, skillObj.x)}_short`,
                    useRadians: true
                }, duration: 0.3
            });
        });

        element.addEventListener("mouseleave", () => {
            cloudtl.invalidate();
            cloudtl.play();
            document.getElementById(element.dataset.skill).classList.remove("selected");
        });
    });

    // Fix nav bar on scroll
    let navBar = document.querySelector("nav");
    let paddedElem = document.querySelector("nav + *");
    ScrollTrigger.create({
        trigger: "nav",
        start: "top top",
        end: "top top",
        onUpdate: self => {
            if (self.progress == 0) {
                navBar.classList.remove("fixed");
                paddedElem.style.marginTop = '0';
            } else {
                navBar.classList.add("fixed");
                paddedElem.style.marginTop = `${navBar.clientHeight}px`;
            }
        }
    });

    let navLinks = document.querySelectorAll("nav a");
    let navAbout = document.querySelector("nav a[href='#about']");
    let navSkills = document.querySelector("nav a[href='#skills']");
    let navList = document.querySelector("nav ul");

    document.querySelector("#menuButton i").addEventListener("click", () => {
        navList.classList.toggle("open");
    });

    navLinks.forEach(link => {
        link.addEventListener("click", () => {
            navList.classList.remove("open");
        });
    });

    // Set about link status
    ScrollTrigger.create({
        trigger: ".seperator.main",
        start: "bottom top",
        end: "bottom top",
        onUpdate: self => {
            if (self.progress == 0) {
                navLinks.forEach(child => child.classList.remove("selected"));
            } else {
                navLinks.forEach(child => child.classList.remove("selected"));
                navAbout.classList.add("selected");
            }
        }
    });

    // Set skills link status
    ScrollTrigger.create({
        trigger: "#about",
        start: "bottom top",
        end: "bottom top",
        onUpdate: self => {
            if (self.progress == 0) {
                navLinks.forEach(child => child.classList.remove("selected"));
                navAbout.classList.add("selected");
            } else {
                navLinks.forEach(child => child.classList.remove("selected"));
                navSkills.classList.add("selected");
            }
        }
    });

    gsap.from("#about > *", {
        x: "-50%", opacity: 0, scrollTrigger: {
            trigger: "#about h2",
            start: "top bottom"
        }
    });

    gsap.from("#skills > *", {
        x: "-50%", opacity: 0, scrollTrigger: {
            trigger: "#skills h2",
            start: "top bottom"
        }
    });
}