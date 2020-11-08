const {
    Builder,
    By,
    Key,
    until
} = require('selenium-webdriver');
const DomParser = require('dom-parser');
var parser = new DomParser();
const fs = require('fs');
const {
    count
} = require('console');

var driver;

exports.init = async () => {
    return await new Builder().forBrowser('chrome').build();
}

exports.gotTo = async link => {
    try {
        await driver.get(link);
    } catch (error) {
        console.log(error);
    }
}

exports.getStops = async () => {
    try {
        driver = await this.init();
        await this.gotTo('http://www.cyprusbybus.com/stopsearch.aspx');
        let tree = {};
        // * GET NUMBER OF PAGES
        var dom = parser.parseFromString(await driver.getPageSource());
        var nextBtn = await driver.findElement(By.xpath('/html/body/form/table[2]/tbody/tr[1]/td/table/tbody/tr[2]/td/table[2]/tbody/tr/td/table/tbody/tr/td[1]/table[2]/tbody/tr/td/table/tbody/tr[3]/td[2]/table/tbody/tr/td/table/tbody/tr/td[1]/table/tbody/tr/td[6]/input[1]'))[0];
        let pagesNumber = await driver.findElement(By.xpath('/html/body/form/table[2]/tbody/tr[1]/td/table/tbody/tr[2]/td/table[2]/tbody/tr/td/table/tbody/tr/td[1]/table[2]/tbody/tr/td/table/tbody/tr[3]/td[2]/table/tbody/tr/td/table/tbody/tr/td[1]/table/tbody/tr/td[4]')).getText()
        pagesNumber = parseInt(pagesNumber.split('of')[1]);
        var counter = 1;
        do {
            var dom = parser.parseFromString(await driver.getPageSource());
            let table = dom.getElementById('ctl00_ContentPlaceHolder1_gvResults');
            let elements = table.getElementsByTagName('tr');
            for (const trId in elements) {
                if (elements.hasOwnProperty(trId)) {
                    const tr = elements[trId];
                    const td = tr.getElementsByTagName('td')[0];
                    let stop = td.getElementsByTagName('a')[0];
                    let stopCityContainer = td.getElementsByTagName('b')[0];
                    let mapLinkContainer;
                    if(tr.getElementsByTagName('td')[2]) mapLinkContainer = tr.getElementsByTagName('td')[2].getElementsByTagName('a')[0].getAttribute('href');
                    if (stopCityContainer) {
                        let cityContainer = stopCityContainer.textContent.replace('(', '').replace(')', '').replace(/(\r\n|\n|\r)/gm, " ");
                        if (!(tree.hasOwnProperty(cityContainer))) tree[cityContainer] = {};
                        if (stop) {
                            let stopText = stop.textContent.replace(/(\r\n|\n|\r)/gm, "");
                            tree[cityContainer][stopText] = {
                                name: stopText,
                                mapLink : mapLinkContainer
                            }
                        };
                    }
                }
            }
            try {
                await driver.executeScript('window.scrollTo(0,10000);');
            } catch (err) {
                let erroro = err
            }
            await driver.findElement(By.id('ctl00_ContentPlaceHolder1_GridsPagerControl1_ImageButton3')).click();
            counter++;
            console.log(counter);
        } while (counter <= pagesNumber);

        fs.writeFileSync('./data/stops.json', JSON.stringify(tree));
    } catch (error) {
        console.log(error);
    }
}

exports.getBuses = async () => {
    try {
        let out = {};
        driver = await this.init();
        let busesPages = [1, 4, 5, 6, 7, 8, 9, 10];
        for (const busCounter in busesPages) {
            await this.gotTo(`http://www.cyprusbybus.com/routes.aspx?sid=${busesPages[busCounter]}`);

            let table = dom.getElementById('ctl00_ContentPlaceHolder1_gvRoutes');
            let buses = table.getElementsByTagName('a');
            console.log(buses);
            for (const elementId in buses) {
                if (buses.hasOwnProperty(elementId)) {
                    const bus = buses[elementId];
                    if (bus.getElementsByTagName('i')[0]) {
                        let busName = bus.getElementsByTagName('i')[0].textContent;
                        let link = bus.getAttribute('href');
                        out[busName] = {
                            link: link
                        }
                    }
                }
            }
        }
        fs.writeFileSync('./data/buses.json', JSON.stringify(out));
    } catch (error) {
        console.log(error);
    }
}

exports.getBusInfo = async () => {
    try {
        const buses = require('./data/buses.json');
        let newBuses = buses;
        driver = await this.init();
        for (const busId in buses) {
            if (buses.hasOwnProperty(busId)) {
                const bus = buses[busId];
                await this.gotTo(bus.link);
                let dom = parser.parseFromString(await driver.getPageSource());
                let table = dom.getElementById('ctl00_ContentPlaceHolder1_RouteDetailsControl1_gvRoutes')
                let stops = table.getElementsByClassName('routedisplay-row');
                for (const stopCounter in stops) {
                    if (stops.hasOwnProperty(stopCounter)) {
                        const stop = stops[stopCounter];
                        if (stop.getElementsByTagName('td')[2]) {
                            if(newBuses[busId].stops) newBuses[busId].stops.push(stop.getElementsByTagName('td')[2].textContent);
                            else newBuses[busId].stops = [stop.getElementsByTagName('td')[2].textContent];
                        }
                    }
                }
            }
        }
        fs.writeFileSync('buses.json', JSON.stringify(newBuses));
    } catch (error) {
        console.log(error)
    }
}

exports.exportStops = async ()=>{
    try {
        let out = {};
        const stops = require('./data/stops.json');
        for (const stopCat in stops) {
            if (stops.hasOwnProperty(stopCat)) {
                const category = stops[stopCat];
                for (const stopCounter in category) {
                    if (category.hasOwnProperty(stopCounter)) {
                        const stop = category[stopCounter];
                        out[stop.name] = {mapLink : stop.mapLink ,category : stopCat};
                    }
                }
            }
        }
        fs.writeFileSync('./data/finalStops.json',JSON.stringify(out));
    } catch (error) {
        console.log(error);
    }
}

exports.connectBusesStops = async ()=>{
    try {
        let out = require('./data/finalStops.json');
        let buses = require('./data/buses.json');
        for (const busId in buses) {
            if (buses.hasOwnProperty(busId)) {
                const bus = buses[busId];
                let stops = bus.stops;
                stops.forEach(stop => {
                    if(out[stop] && out[stop].buses) out[stop].buses.push(busId);
                    else if (out[stop]) out[stop].buses = [busId];
                });
            }
        }
        fs.writeFileSync('./data/finalStops1.json',JSON.stringify(out));
    } catch (error) {
        console.log(error);
    }
}

exports.getStopsLocations = async ()=>{
    try {
        let out = require('./data/finalStops1.json');
        driver = await this.init();
        for (const stopId in out) {
            if (out.hasOwnProperty(stopId)) {
                const stop = out[stopId];
                await this.gotTo(stop.mapLink);
                try {
                    await driver.executeScript(
                        `(()=>{
                            let temp = document.createElement('p');
                            let item = {lat : nodeMarkers[0].position.lat(),lng : nodeMarkers[0].position.lng()};
                            let newContent = document.createTextNode(JSON.stringify(item));
                            temp.appendChild(newContent);
                            temp.id = 'workingTest';
                            document.body.append(temp);
                        })()`
                        );
                } catch (err) {
                    let errrororo = err;
                }
                let dom = parser.parseFromString(await driver.getPageSource());
                let location = dom.getElementById('workingTest');
                if(location) location = location.textContent;
                out[stopId].location = location;
            }
        }

        fs.writeFileSync('./data/finalStops2.json',JSON.stringify(out));
    } catch (error) {
        console.log(error);
    }
}

this.getStopsLocations();