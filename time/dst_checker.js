import pkg from 'dst-transitions';
import { DateTime } from 'luxon';

const dst = pkg

function getTransitions(year) {
    var transitions = dst.get_transitions(year);

    //let fallFrom = new Date(transitions.fall.from);
    let fallTo = new Date(transitions.fall.to);
    //let springFrom = new Date(transitions.spring.from);
    let springTo = new Date(transitions.spring.to);

    //console.log(`Fall ${fallFrom} to ${fallTo}`);
    //console.log(`Spring transition ${springFrom} to ${springTo}`);

    let timeToFall = DateTime.fromJSDate(fallTo).diffNow('minutes').toObject();
    let timeToSpring = DateTime.fromJSDate(springTo).diffNow('minutes').toObject();

    console.log(timeToFall);
    console.log(timeToSpring);

    if (timeToFall.minutes <= 540) {
        return "fall";
    } else if (timeToSpring <= 540) {
        return "spring";
    } else {
        return "noChange";
    }
}

function adjustForDS(transition) {
    if (transition === "fall") {
        console.log(540  + 60);
        return 60;
    } else if (transition === "spring") {
        console.log(540 + -60);
        return -60;
    } else if (transition === "noChange") {
        console.log(540 + 0);
        return 0; 
    }
}

export { getTransitions, adjustForDS };
