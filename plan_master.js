////////////////////////////////////////////////////////////////////////////////
//
// Long Range Transportation Plan Needs Assessment Application 
// Version 2 - for 2040 LRTP "Destination 2040"
// 
// Version 1 of app was originally written by Mary McShane ca. 2013-14.
// Version 2 is derived from Version 1; the details are as follows:
//     1. Mary's code was migrated from OpenLayers v2 to v3 in the
//        summer of 2017 by Ethan Ebinger. This was "Version 1A."
//     2. The server-side data was migrated from ArcSDE/Oracle to
//        PostGIS/PostgreSQL (and the relevant OpenLayers calls to
//        WMS and WFS services in version 1A were modified accordingly) 
//        by Ben Krepp in fall of 2017. This was "Version 1B."
//        Version 1B was used as the basis for this version.
//     3. The data is that for the 2040 LRTP rather than the 2035 LRTP.
//     4. An effort has been made to 'clean up'/rationalize the code
//        to whatever extent was possible, given budget and schedule
//        constraints. It should go without saying that the result
//        is a less that what the author of these comments would have
//        liked. Among other things, the author of Version 1 did not have
//		  a confident grasp of how scope works in JavaScript.
//        Consequently the original code had both many variables
//        that were global (but did not need to be) as well as
//        object properties that could have been simple local
//        variables. An effort was made to expunge as many instances
//        of these infelicities as possible, but it was not possible
//        to accomplish this completely, given the constraints 
//        under which this project was undertaken. This having
//        been said, the result is a significant step forward        
//        towards making the code more robust and maintainable
//        Going forward, however, a "rewrite from scratch" should
//        seriously be considered.
//
// Organization of the code in this file:
//
// 1. Global object and global application object.
// 2. A few pretty fundamental properties on the application object.
// 3. The PLAN global object, which encapsulates:
//    a. 'Shortcut' means of referring to the GeoServer layers used
//       in this app; these were previously kept in global variables. 
//    b. Information about (most of) the OpenLayers layers used in this app;
//       specifically, this is where one can find the {GeoServer layer, SLD}
//       pairs for the OpenLayers layers in this app.
//    c. The URLs for the few custom legend graphics used in this app.
//    d. Information used when setting up downloads of various data tables.
// 4. A hodge-podge of functions at the global scope that, at least
//    at this point in time, haven't been moved into a non-global
//    scope. This includes the function to generate "accessible tabs." 
// 5. The $(document).ready event handler for this application.
//    This event handler "wraps" most of the logic for the app,
//    with the exception of code to initialize the OpenLayers
//    map for the app and a few associated ancillary functions.
//    This one $(document).ready handler replaces nearly a half-dozen
//    such handlers found in several different places in the code 
//    for Version 1.
// 6. CTPS.lrtpApp.init() - the initialization function for the
//    OpenLayers map in this app, and a couple of related 
//    ancillary functions.
//
// -- Ben Krepp 01/31/2018, 02/20/2018, 03/14/2018
//    Updates to some data sources 06/13/2018, 11/20/2018

var CTPS = {};
CTPS.lrtpApp = {};
CTPS.lrtpApp.map = {};
CTPS.lrtpApp.mapCenter = [232908.27147578463, 902215.0940791398];
CTPS.lrtpApp.mapZoom = 3.0;
CTPS.lrtpApp.initialExtent = [182154.0280675815, 862336.7599726944, 283662.5148839877, 942093.4281855851];

// Setting this to true adds the OpenLayers layer switcher control to the map.
CTPS.lrtpApp.debugFlag = true;

// Cached value of corridor selected by user. ??? Why was this done??? 
// -- BK 02/06/2018
CTPS.lrtpApp.myCorridor = '';

// CTPS.lrtpApp.szServerRoot = 'http://www.ctps.org:8080/geoserver/'; 
CTPS.lrtpApp.szServerRoot = location.protocol + '//' + location.hostname + '/maploc/'; 
CTPS.lrtpApp.szWMSserverRoot = CTPS.lrtpApp.szServerRoot + '/wms'; 
CTPS.lrtpApp.szWFSserverRoot = CTPS.lrtpApp.szServerRoot + '/wfs';

// Global object to encapsulate various pieces of information re: GeoServer layers, OL map layers, etc.
// Replaces global variables in previous versions of this app.
var PLAN = {};
// Shorthand means of referring to GeoServer layers
PLAN.gs_layers = {
	'taz2727'			:	'postgis:dest2040_taz_demographics',		// Only contains demographic data; no longer contains truck trip density data
	'taz2727_trucks' 	:	'postgis:dest2040_taz_trucks',				// Only contains truck trip density data, no demographic data
	'taz2727_donut'		: 	'postgis:dest2040_taz_demographic_donut',	// Uses only stops on primary-variation bus routes as the bus part of dissolved buffer/cookie cutter. 
	'corridors'			: 	'postgis:dest2040_corridors',
	'central_corr'		:	'postgis:dest2040_circum_corr_poly',
	'VOClayer'			:	'postgis:dest2040_voc',						// A single layer now contains both 2016 and 2040 data.
	'towns_layer'		:	'postgis:mgis_towns_polym',
	'towns_survey_layer':	'postgis:mgis_townssurvey_polym',
	'major_roads'		:	'postgis:ctps_roadinventory_grouped',		// *** To be updated based on 2016 Road Inventory
	'pavement'			:	'postgis:dest2040_pavement_arc',			
	'rapid_transit'		:	'postgis:dest2040_mbta_rt_sl_arc',			// Includes Silver Line
	'CR_arcs'			:	'postgis:dest2040_mbta_cr_arc',	
	'CR_stns'			:	'postgis:dest2040_mbta_cr_sta_augmented',	// Raw KJ deliverable augmented with attrs for radial and circumferential corridor			
	'bus_routes'		:	'postgis:dest2040_bus_routes_mbta_2018q1_v2',	// *** To be updated to 2Q 2018 when data is available
	'airports'			:	'postgis:dest2040_airports_pt',
	'park_ride_lots'	:	'postgis:dest2040_mdot_park_ride',
	'seaports'			:	'postgis:dest2040_mdot_seaports_pt',
	'ferries'			:	'postgis:dest2040_ferries_arc',				// Updated ferry routes delivered by K. Jacob 20 November 2018
	'bikes_built'		:	'postgis:dest2040_bikes_built_arc',
	'bikes_table'		:	'postgis:dest2040_bikes_summtab',																					
	'crash_layer_poly'	:	'postgis:dest2040_crash13_15_h_all_poly',	// Crash layers delivered by K. Jacob on 13 June 2018				
	'crash_layer_pt'	:	'postgis:dest2040_crash13_15_h_all_pt',				
	'crash_bikes_poly'	:	'postgis:dest2040_crash13_15_h_bk_poly',	
	'crash_bikes_pt'	:	'postgis:dest2040_crash13_15_h_bk_pt',	 
	'crash_peds_poly'	:	'postgis:dest2040_crash13_15_h_ped_poly',		
	'crash_peds_pt'		:	'postgis:dest2040_crash13_15_h_ped_pt',		
	'truck_gen'			:	'postgis:plan2035_truck_gen_pt',			// *** To be updated by Bill Kuttner
	'rail_freight'		:	'postgis:dest2040_freight_op_arc',			// N.B. For whaterver reason, table name doesn't include 'freight'
	'spd_idx_table'		:	'postgis:plan2040_spd_index_tbl',			// *** To be updated by Bill Kuttner
	'tt_table'			:	'postgis:plan2040_ttime_index_tbl',			// *** To be updated by Bill Kuttner
	'VOC_table'			:	'postgis:plan2040_voc_2014_tbl'				// *** To be updated by Ben Dowling or Drashti Joshi or Ethan Ebinger or Bill Kuttner or (?)
};
// ***********************************************************************************************************************************
// The following data structures were previously kept in a separate file named "PLAN.js", for no apparent reason.
// They have been moved in-line into this file for the sake of simplicity, and to eliminate the overhead of downloading another file,
// and re-cast as arrays of objects rather than arrays of arrays.
// -- BK 0/18/18
// ***********************************************************************************************************************************
//
// The following data structure is an attempt to re-cast the old 'PLAN.socioeconomic' and
// PLAN.transportation arrays in a more useful and compact form.
// After having made a 1st pass at this, it is clear that in nearly all cases for the demographic layers,
// this data structure  simply provides quick access to the GeoServer layer, SLD, and OpenLayers layer 
// object for each of the logical socioeconomic layers in the app.
// In its previous form, each row in the PLAN.socioeconomic array had a sixth element that was
// "documented" as "layer code" in a comment. There are no existing references to this element
// anywhere in the existing app code; consequently, it has been expunged. 
//
// NOTE: The key values in this object correspond to <option> values in select boxes index.html.
// 
// -- BK 01/31/2018, 2/23/2018
PLAN.map_layers = {
	'2010pop'	 : 	{	'sld' 			: "Dest2040_pop_2010",
						'legendHeader' 	: "Population Density 2010:<br/>Residents per Sq Mi",
						'gsLayer'		: PLAN.gs_layers.taz2727,
						'olLayer'		: "oTAZ"
					},
	'2040pop' 	:	{	'sld' 			: "Dest2040_pop_2040",
						'legendHeader' 	: "Population Density 2040:<br/>Residents per Sq Mi",
						'gsLayer'		: PLAN.gs_layers.taz2727,
						'olLayer'		: "oTAZ"
					},
	'changePop' :	{	'sld' 			: "Dest2040_pop_change",
						'legendHeader' 	: "Change in<br/>Population Density<br/>2010-2040",
						'gsLayer'		: PLAN.gs_layers.taz2727,
						'olLayer'		: "oTAZ"
					},
	'catchment'	:	{	'sld' 			: "Dest2040_pop_2010_donut",
						'legendHeader' 	: "Areas Beyond Range of Transit<br/>Stops/Stations:<br />Residents per Sq Mi",
						'gsLayer'		: PLAN.gs_layers.taz2727_donut,
						'olLayer'		: "oTAZ_donut"
					},
	'2010emp'	: 	{	'sld' 			: "Dest2040_emp_2010",
						'legendHeader' 	: "Employment Density 2010:<br/>Jobs per Sq Mi",
						'gsLayer'		: PLAN.gs_layers.taz2727,
						'olLayer'		: "oTAZ"
					},
    '2040emp'	: 	{	'sld' 			: "Dest2040_emp_2040",
						'legendHeader' 	: "Employment Density 2040:<br/>Jobs per Sq Mi",
						'gsLayer'		: PLAN.gs_layers.taz2727,
						'olLayer'		: "oTAZ"
					},      
	'changeEmp'	:	{	'sld' 			: "Dest2040_emp_change",
						'legendHeader' 	: "Change in<br/>Employment Density<br/>2010-2040",
						'gsLayer'		: PLAN.gs_layers.taz2727,
						'olLayer'		: "oTAZ"
					},
    'eldPop'	:	{	'sld' 			: "Dest2040_elderly_pop",
						'legendHeader' 	: "Population Over<br/>75 Years Old",
						'gsLayer'		: PLAN.gs_layers.taz2727,
						'olLayer'		: "oTAZ"
					},  
	'eldPct'	:	{	'sld' 			: "Dest2040_elderly_pct",
						'legendHeader' 	: "Percent of Population<br/>Over 75 Years Old",
						'gsLayer'		: PLAN.gs_layers.taz2727,
						'olLayer'		: "oTAZ"
					},
	'youthPop'	:	{	'sld' 			: "Dest2040_youth_pop",
						'legendHeader' 	: "Population Less Than<br/>18 Years Old",
						'gsLayer'		: PLAN.gs_layers.taz2727,
						'olLayer'		: "oTAZ"
					},	
	'youthPct'	:	{	'sld' 			: "Dest2040_youth_pct",
						'legendHeader' 	: "Percent of Population<br/>Less Than 18 Years Old",
						'gsLayer'		: PLAN.gs_layers.taz2727,
						'olLayer'		: "oTAZ"
					},
	'disabledPop':	{	'sld' 			: "Dest2040_disabled_pop",
						'legendHeader' 	: "Disabled Population",
						'gsLayer'		: PLAN.gs_layers.taz2727,
						'olLayer'		: "oTAZ"
					},
	'disabledPct':	{	'sld' 			: "Dest2040_disabled_pct",
						'legendHeader' 	: "Percent of Population Disabled",
						'gsLayer'		: PLAN.gs_layers.taz2727,
						'olLayer'		: "oTAZ"
					},
	'minorityPop':	{	'sld' 			: "Dest2040_miniority_pop",
						'legendHeader' 	: "Minority Population",
						'gsLayer'		: PLAN.gs_layers.taz2727,
						'olLayer'		: "oTAZ"
					},
	'minorityPct':	{	'sld' 			: "Dest2040_minority_pct",
						'legendHeader' 	: "Percent of Minority Population",
						'gsLayer'		: PLAN.gs_layers.taz2727,
						'olLayer'		: "oTAZ"
					},
	'lepPop'	:	{	'sld' 			: "Dest2040_lep_pop",
						'legendHeader' 	: "Population<br/>with Limited<br/>English Proficiency",
						'gsLayer'		:  PLAN.gs_layers.taz2727,
						'olLayer'		: "oTAZ"
					},
	'lepPct'	:	{	'sld' 			: "Dest2040_lep_pct",
						'legendHeader' 	: "Percent of Population<br/>with Limited<br/>English Proficiency",
						'gsLayer'		: PLAN.gs_layers.taz2727,
						'olLayer'		: "oTAZ"
					},
	'TitleVI'	:	{	'sld' 			: "Dest2040_Title_VI",
						'legendHeader' 	: "Minority and<br/>Limited English Proficiency<br/>Zones Under Title VI",
						'gsLayer'		: PLAN.gs_layers.taz2727,
						'olLayer'		: "oTAZ"
					},
	'EJConcern'	:	{	'sld' 			: "Dest2040_EJ_concern",
						'legendHeader' 	: "Environmental Justice<br/>Areas of Concern",
						'gsLayer'		: PLAN.gs_layers.taz2727,
						'olLayer'		: "oTAZ"
					},
	'elderlyZone':	{	'sld' 			: "Dest2040_elderly_zone",
						'legendHeader' 	: "Zone exceeds MPO elderly population percentage threshold (6.9%)",
						'gsLayer'		: PLAN.gs_layers.taz2727,
						'olLayer'		: "oTAZ"
					},
	'youthZone'	:	{	'sld' 			: "Dest2040_youth_zone",
						'legendHeader' 	: "Zone exceeds MPO youth population percentage threshold (20.6%)",
						'gsLayer'		: PLAN.gs_layers.taz2727,
						'olLayer'		: "oTAZ"
					},
	'disabledZone':	{	'sld' 			: "Dest2040_disabled_zone",
						'legendHeader' 	: "Zone exceeds MPO disabled population percentage threshold (10.0%)",
						'gsLayer'		: PLAN.gs_layers.taz2727,
						'olLayer'		: "oTAZ"
					},
	'zvhhZone'	:	{	'sld' 			: "Dest2040_zvhh_zone",
						'legendHeader' 	: "Zone exceeds MPO zero vehichle household percentage threshold (16.0%)",
						'gsLayer'		: PLAN.gs_layers.taz2727,
						'olLayer'		: "oTAZ"
					},
	'2010HH'	:	{	'sld' 			: "Dest2040_hh_2010",
						'legendHeader' 	: "Households per Square Mi<br/>2010",
						'gsLayer'		: PLAN.gs_layers.taz2727,
						'olLayer'		: "oTAZ"
					},
	'2040HH'	:	{	'sld' 			: "Dest2040_hh_2040",
						'legendHeader' 	: "Household per Square Mi<br/>2040",
						'gsLayer'		: PLAN.gs_layers.taz2727,
						'olLayer'		: "oTAZ"
					},
	'changeHH'	: 	{	'sld' 			: "Dest2040_zero_veh_hh",
						'legendHeader' 	: "Change in<br/>Number of Households<br>2010-2040",
						'gsLayer'		: PLAN.gs_layers.taz2727,
						'olLayer'		: "oTAZ"
					},
	'zero_veh_hh':	{	'sld' 			: "Dest2040_zero_veh_hh",
						'legendHeader' 	: "Zero-vehicle Households",
						'gsLayer'		: PLAN.gs_layers.taz2727,
						'olLayer'		: "oTAZ"
					},
	'zero_veh_hh_pct'	: 	{	'sld' 			: "Dest2040_zero_veh_hh_pct",
								'legendHeader' 	: "Percent of Households<br/>with Zero Vehicles",
								'gsLayer'		: PLAN.gs_layers.taz2727,
								'olLayer'		: "oTAZ"
							},
	'low_inc_hh' :	{	'sld' 			: "Dest2040_low_inc_hh",
						'legendHeader' 	: "Percent of Households<br/>with Low Income",
						'gsLayer'		: PLAN.gs_layers.taz2727,
						'olLayer'		: "oTAZ"
					},
	'low_inc_hh_pct'	: 	{	'sld' 			: "Dest2040_low_inc_hh_pct",
								'legendHeader' 	: "Percent of Households<br/>with Low Income",
								'gsLayer'		: PLAN.gs_layers.taz2727,
								'olLayer'		: "oTAZ"
							},	
	'highway'	:	{	'sld' 			: 'Plan2035_RoadsMultiscaleGrouped_01',
						'legendHeader' 	: 'Major Roadways',
						'gsLayer'		: PLAN.gs_layers.major_roads,
						'olLayer'		: 'oRoads'
					},
	'pavement'	:	{	'sld' 			: 'Dest2040_pavement_cond',
						'legendHeader' 	: 'Pavement Condition',
						'gsLayer'		: PLAN.gs_layers.pavement,
						'olLayer'		: 'oPavement'
					},
	'RT'		: 	{	'sld' 			: 'Dest2040_mbta_rapid_transit',
						'legendHeader' 	: 'MBTA Rapid Transit',
						'gsLayer'		: PLAN.gs_layers.rapid_transit,
						'olLayer'		: 'oRT'
					},
						// Note that the SLD for the commuter rail stations layer is set as that layer's default style in the GeoServer layer definition.
	'CR'		:	{	'sld' 			: 'Dest2040_mbta_CR', 
						'legendHeader' 	: 'MBTA Commuter Rail',
						'gsLayer'		: PLAN.gs_layers.CR_arcs + "," + PLAN.gs_layers.CR_stns,
						'olLayer'		: 'oCR'
					},
    'airports_etc':	{	'sld' 			: 'point',
						'legendHeader' 	: 'Transportation Facilities',
						'gsLayer'		: PLAN.gs_layers.airports,
						'olLayer'		: 'oPorts_PkRide'
					},                                                                  
    'ferries'	:	{	'sld' 			: 'Dest2040_ferry_routes',
						'legendHeader' 	: 'Commuter Boats and Ferries',
						'gsLayer'		: PLAN.gs_layers.ferries,
						'olLayer'		: 'oFerries'
					},                                                                
    'bikes'		:	{	'sld' 			: 'Dest2040_bikes',
						'legendHeader' 	: 'Dedicated Bicycle Paths',
						'gsLayer'		: PLAN.gs_layers.bikes_built,
						'olLayer'		: 'oBikes'
					},  
	'truckgen'	:	{	'sld'			: 'Plan2035_truckgen_2030',
						'legendHeader' 	: 'Selected Truck Trip Generators',
						'gsLayer'		: PLAN.gs_layers.truck_gen,
						'olLayer'		: 'oTruckGen'
					},
    '2016trucks':	{	'sld' 			: 'Dest2040_trucks_2016',
						'legendHeader' 	: 'Truck Trips per Sq Mi 2016',
						'gsLayer'		: PLAN.gs_layers.taz2727_trucks,
						'olLayer'		: 'oTAZ_trucks'
					},                                                    
	'2040trucks' :	{	'sld' 			: 'Dest2040_trucks_2040',
						'legendHeader' 	: 'Truck Trips per Sq Mi 2040',
						'gsLayer'		: PLAN.gs_layers.taz2727_trucks,
						'olLayer'		: 'oTAZ_trucks'
					},
	'change_trucks':{	'sld' 			: 'Dest2040_trucks_change',
						'legendHeader' 	: 'Change in Truck Trip Density, 2016-2040',
						'gsLayer'		: PLAN.gs_layers.taz2727_trucks,
						'olLayer'		: 'oTAZ_trucks'
					},
	'VOC2016_AM_E':	{	'sld' 			: 'Dest2040_voc_2016_AM_Exp',
						'legendHeader' 	: 'Volume-to-Capacity Ratio 2016 AM - Expressways',
						'gsLayer'		: PLAN.gs_layers.VOClayer,
						'olLayer'		: 'oVOC'
					},
    'VOC2016_AM_A':	{	'sld' 			: 'Dest2040_voc_2016_AM_Art',
						'legendHeader' 	: 'Volume-to-Capacity Ratio 2016 AM - Arterials',
						'gsLayer'		: PLAN.gs_layers.VOClayer,
						'olLayer'		: 'oVOC'
					},                             
	'VOC2016_PM_E':	{	'sld' 			: 'Dest2040_voc_2016_PM_Exp',
						'legendHeader' 	: 'Volume-to-Capacity Ratio 2016 PM - Expressways',
						'gsLayer'		: PLAN.gs_layers.VOClayer,
						'olLayer'		: 'oVOC'
					},
	'VOC2016_PM_A':	{	'sld' 			: 'Dest2040_voc_2016_PM_Art',
						'legendHeader' 	: 'Volume-to-Capacity Ratio 2016 PM - Arterials',
						'gsLayer'		: PLAN.gs_layers.VOClayer,
						'olLayer'		: 'oVOC'
					},				
	'VOC2040_AM_E':	{	'sld' 			: 'Dest2040_voc_2040_AM_Exp',
						'legendHeader' 	: 'Volume-to-Capacity Ratio 2040 AM - Expressways',
						'gsLayer'		: PLAN.gs_layers.VOClayer,
						'olLayer'		: 'oVOC'
					},					
	'VOC2040_AM_A':	{	'sld' 			: 'Dest2040_voc_2040_AM_Art',
						'legendHeader' 	: 'Volume-to-Capacity Ratio 2040 AM - Arterials',
						'gsLayer'		: PLAN.gs_layers.VOClayer,
						'olLayer'		: 'oVOC'
					},
	'VOC2040_PM_E':	{	'sld' 			: 'Dest2040_voc_2040_PM_Exp',
						'legendHeader' 	: 'Volume-to-Capacity Ratio 2040 PM - Expressways',
						'gsLayer'		: PLAN.gs_layers.VOClayer,
						'olLayer'		: 'oVOC'
					},				
	'VOC2040_PM_A':	{	'sld' 			: 'Dest2040_voc_2040_PM_Art',
						'legendHeader' 	: 'Volume-to-Capacity Ratio 2040 PM - Arterials',
						'gsLayer'		: PLAN.gs_layers.VOClayer,
						'olLayer'		: 'oVOC'
					},
	'crashes'	:	{	'sld' 			: 'Dest2040_crash_gen_poly_1color,Dest2040_crash_gen_point_1color',
						'legendHeader' 	: 'Top 5% Crash Locations (2013-2015): Equivalent Property Damage Only <br />(EPDO) Ratings',
						'gsLayer'		: PLAN.gs_layers.crash_layer_poly + ',' + PLAN.gs_layers.crash_layer_pt,
						'olLayer'		: 'oCrashes'
					},
	'bike_crashes':	{	'sld' 			: 'Dest2040_crash_bike_poly_1color,Dest2040_crash_bike_point_1color',
						'legendHeader' 	: 'Top 5% Bike Crash Locations (2013-2015): Equivalent Property Damage Only <br />(EPDO) Ratings',
						'gsLayer'		: PLAN.gs_layers.crash_bikes_poly + ',' + PLAN.gs_layers.crash_bikes_pt,
						'olLayer'		: 'oBikeCrashes'
					},
	'ped_crashes':	{	'sld' 			: 'Dest2040_crash_ped_poly_1color,Dest2040_crash_ped_point_1color',
						'legendHeader' 	: 'Top 5% Pedestrian Crash Locations (2013-2015): Equivalent Property Damage Only (EPDO) Ratings',
						'gsLayer'		: PLAN.gs_layers.crash_peds_poly + ',' + PLAN.gs_layers.crash_peds_pt,
						'olLayer'		: 'oPedCrashes'
					},
    'rail_freight':	{	'sld' 			: 'Dest2040_rail_freight',
						'legendHeader' 	: 'Massachusetts Rail Freight Lines: Operators',
						'gsLayer'		: PLAN.gs_layers.rail_freight,
						'olLayer'		: 'oRailFreight'
					}
};
PLAN.custom_legends = {
	'airports_etc'	:	"<img src='images/airport_mrk2.gif' width='8%'></img>&nbsp;<span class='legend-label'>Airports</span>" +
						"<br /><img src='images/park_ride7.gif' width='8%'></img>&nbsp;<span class='legend-label'>Park-ride lots</span>" +
						"<br /><img src='images/port.gif' width='8%'></img>&nbsp;<span class='legend-label'>Passenger docks</span>",
	
	'CR'			:	"<img src='images/purple_line3.gif' width='25%'></img>&nbsp;<span class='legend-label'>Rail lines</span>" +
						"<br />&nbsp;&nbsp;&nbsp;<img src='images/mbta_symbol.gif' width='8%'></img>&nbsp;&nbsp;&nbsp;&nbsp;<span class='legend-label'>Stations</span>",
	
	'highway'		:	"<img src='images/interstate_2dig.gif' width='10%'></img>&nbsp;<span class='legend-label'> Interstate</span>" +
						"<br /><img src='images/US3.gif' width='10%'></img>&nbsp;<span class='legend-label'> U.S. highway</span>" +
						"<br /><img src='images/state_square_b.gif' width='8%'></img>&nbsp;<span class='legend-label'> State route</span>"
};
PLAN.download_info = {
	'Population': 			{ typename		: PLAN.gs_layers.taz2727,
							  propertyname	: "taz,total_pop_2010,pop_psqmi_2010,total_pop_u18_2010,pop_u18_pct_2010,total_pop_75plus_2010,pop_75plus_pct_2010," +
                                              "total_minority_pop_2010,minority_pop_pct_2010,total_lep_pop_2010,lep_pop_pct_2010,total_disabled_pop_2010," +
                                              "disabled_pop_pct_2010,total_pop_2040,pop_psqmi_2040,pop_psqmi_change_2010_2040"
							},
	'Employment':			{ typename		: PLAN.gs_layers.taz2727,
							  propertyname	: "taz,total_emp_2010,emp_sqmi_2010,total_emp_2040,emp_psqmi_2040,emp_psqmi_change_2010_2040"
							},
	'Households':			{ typename		: PLAN.gs_layers.taz2727,
							  propertyname	: "taz,census_hh_2010,hh_psqmi_2010,	total_lowinc_hh_2010,lowinc_hh_pct_2010," +
							                  "total_zero_veh_hh_2010,zero_veh_hh_pct_2010,hh_psqmi_2040,hh_psqmi_change_2010_2040" 
							},
	'Top 5% Crashes': 		{ typename		: PLAN.gs_layers.crash_layer_poly,
							  propertyname	: "epdo,l1street,l2street,towns,plan2035_radial_corr,crashcount,circumferential_corridor" 
							},
	'Volume-to-Capacity Ratio'	:	{ typename		: PLAN.gs_layers.VOC_table,
									  propertyname	: "plan2035_radial_corr,circumferential_corridor,roadway_type,peak_period,roadway,voc"
									},
	'Speed Index':			{ typename		: PLAN.gs_layers.spd_idx_table,
							  propertyname	: "year,plan2035_radial_corr,circumferential_corridor,peakperiod,route,direction,from_to,speedindex" 
							},
	'Travel Time Index':	{ typename		: PLAN.gs_layers.tt_table,
							  propertyname	: "year,plan2035_radial_corr,circumferential_corridor,peakperiod,route,direction,from_to,traveltimeindex"
							},
	'Commuter Rail Stations': { typename		:PLAN.gs_layers.CR_stns,
								propertyname	: "station,line_brnch,plan2035_radial_corr"
							  },
	'Airports':				{ typename		: PLAN.gs_layers.airports,
							  propertyname	: "town,airport_name"
							},
	'Park and Ride Lots':	{ typename		: PLAN.gs_layers.park_ride_lots,
							  propertyname	: "town,location,capacity,bus_service"
							},
	'Boat Docks':			{ typename		: PLAN.gs_layers.seaports,
							  propertyname	: "term_name,passenger,town,service"
							},
	'Bicyle Paths':			{ typename		: PLAN.gs_layers.bikes_table,
							  propertyname	: "localname,length_miles"
							}
}; 
// ***********************************************************************************************************************************
// End of code previously kept in separate "PLAN.js" file.
// ***********************************************************************************************************************************


var CSSClass = {};
CSSClass.is = function(e, c){                               
	//  Not enough to pass in the NAME of the element to be tested--you also have to grab it from the DOM; hence the next line.
    var e = document.getElementById(e);
	//e  is the element being tested
    return e.className.search("\\b" + c + "\\b") != -1;
}
// Adds class 'hidden' to element 'mytabs'
CSSClass.add = function(element){
	var e = document.getElementById(element);
	e.className += ' hidden';
}
// Removes class 'hidden' from element 'mytabs'
CSSClass.remove = function(element){
	var e = document.getElementById(element);
	e.className = e.className.replace(/hidden/gi,"");
} 

// Accessible Tabs Package
//
// Baased on Dirk Ginader's accessible tabs.
// See: http://www.accessibleculture.org/research-files/accessible-tabs/case1.php#tabs
// Mary McShane customized Dirk's code so that tab headers are not repeated at the end of the page.
// (Mary's comment.)
//
var AccTabs = (function() {
    $(function() {
        //for each DIV containing a set of tabs...
        $(".tabs").each( 
            function(t){
                var tabsDiv=$(this);
                var targetId="tab-"+t;
                var list='';
                //for the h2 in each tab div
                $(tabsDiv).find("h2").each(
                    function(h){
                        list+='<li><a href="#' + targetId + '">' + $(this).text() + '</a></li>';
                        $(this).remove();
                    }
                );
                $(tabsDiv).prepend('<ul class="tabsMenu">' + list + '</ul>').find(">div").addClass("tab").hide();
                $(tabsDiv).find(".tab:first").show().before('<h2 class="mainH2"><a id="' + targetId +'" tabindex="-1">' + $(tabsDiv).find(".tabsMenu>li:first").text() + '</a></h2>');
                $(tabsDiv).find(".tabsMenu>li:first").toggleClass("current").find("a").prepend('<span>Current Tab: </span>');
                //for each tabs menu link
                $(tabsDiv).find(">ul>li>a").each(
                    function(a){
                        $(this).click(
                            function(e){	
                                e.preventDefault();
                                $(tabsDiv).find(">ul>li.current").toggleClass("current").find(">a>span").remove();
                                $(this).blur();
                                $(tabsDiv).find(".tab:visible").hide();
                                $(tabsDiv).find(".tab").eq(a).show();
                                $("#" + targetId).text($(this).text()).focus();//NOTE: focus is being set BEFORE the span is written to the tab menu anchor and the li class change
                                $(this).prepend('<span>Current Tab: </span>').parent().toggleClass("current");
                            }
                        );
                    }
                );
            }
        );
    });
})();

// The following is almost certainly no longer needed.
if (!Array.prototype.indexOf) {
  // console.log('Browser does not support Array indexOf method.');
  Array.prototype.indexOf = function (searchElement /*, fromIndex */ ) {
    'use strict';
    if (this == null) {
      throw new TypeError();
    }
    var n, k, t = Object(this),
        len = t.length >>> 0;

    if (len === 0) {
      return -1;
    }
    n = 0;
    if (arguments.length > 1) {
      n = Number(arguments[1]);
      if (n != n) { // shortcut for verifying if it's NaN
        n = 0;
      } else if (n != 0 && n != Infinity && n != -Infinity) {
        n = (n > 0 || -1) * Math.floor(Math.abs(n));
      }
    }
    if (n >= len) {
      return -1;
    }
    for (k = n >= 0 ? n : Math.max(len - Math.abs(n), 0); k < len; k++) {
      if (k in t && t[k] === searchElement) {
        return k;
      }
    }
    return -1;
  };
}

// Functions below used to close and open each theme/category box with its radio buttons--but leaves headers showing.
//
// Function toggles hiding and unhiding the SECTION (population, employment, elderly)
// NOTE: CSS currently uses 'display: none' -- this means no spaces left between elements, which can then move up on the page
// -- MMcS
function unhide(divID) {

	var item = document.getElementById(divID);
	if (item) {
		item.className=(item.className==='hidden')?'unhidden':'hidden';
	};
};

// Function toggles hiding and unhiding the buttons and other elements that go on and off depending on user clicks
// NOTE: CSS currently uses 'visibility: none' so that spaces ARE left between elements (in this case, buttons are not all scrunched together)
// -- MMcS
function unhideLine(divID) {

	var item = document.getElementById(divID);
	if (item) {
		item.className=(item.className==='hidden2')?'unhidden2':'hidden2';
	};
};

////////////////////////////////////////////////////////////////////////////////
//
// This is the single $(document).ready event handler for this app.
// 
////////////////////////////////////////////////////////////////////////////////
$(document).ready(function(e){    
	// Miscellaneous utility functions:
   	// Converts data read in from OpenLayers Request from all-caps or all-lower-case to Title Case. 
	//
	var toTitleCase = function(str){
		return str.replace(/\w\S*/g, function(txt){
			return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
		});
	};
	
	// Function to make sort functions, parameterized on name of property on which to sort,
	// and specific sort functions made therefrom.
	//
	function makeSortFn(propName) {
		return function(x,y) {
			return ((x[propName] == y[propName]) ? 0 : ((x[propName] > y[propName]) ? 1 : -1 ));
		}
	}
	var SortByTaz = makeSortFn('TAZ');    
	var SortByTown = makeSortFn('TOWN');
	var SortByEPDO = makeSortFn('EPDO');
	var SortByIndex = makeSortFn('INDEX');
	var SortByPeriod = makeSortFn('PEAKPERIOD');
	var SortByStn = makeSortFn('STATION');
	var SortByName = makeSortFn('LOCALNAME');
	
	var legendManager = (function() {
		// Number of last legend div; this is really a CONST
		var maxLegendDiv = 5;
		// Number of next available legend div
		var nextAvailDiv = 1;

		// Maps legend name (i.e., "kind") to width (in pixels) necessary to accommodate
		// a legend of this kind.
		// Now a fossil.
		var legendKindWidth =	{ 	"demographic" 		: 250,
									"infrastructure" 	: 210,
									"crash" 			: 180,
									"voc" 				: 180,
									"truck" 			: 180 
		};		
		
		// Maps legend name (i.e., "kind") to number of legend div in which it currently resides,
		// or to 0 if legend is not currently being displayed
		var legendNameToDiv = { "demographic" 		: 0,
		                        "infrastructure" 	: 0,
								"crash" 			: 0,
								"voc" 				: 0,
								"truck" 			: 0 
		};
		
		// Maps legend div number (as string) to current properties of legend div
		var divState = { 	"1" : { populated: false, name: '' },
							"2" : { populated: false, name: '' },
							"3" : { populated: false, name: '' },
							"4" : { populated: false, name: '' },
							"5" : { populated: false, name: '' } 
		};
		
		var shuffleLegend = function(fromDivNum, toDivNum) {
			console.log('Shuffling legend from div ' + fromDivNum + ' to div ' + toDivNum);
			
			var fromWrapperDiv = 'legend_wrapper_' + fromDivNum;
			var fromHeaderDiv = 'legend_header_' + fromDivNum;
			var fromBodyDiv = 'legend_div_' + fromDivNum;
			var toWrapperDiv = 'legend_wrapper_' + toDivNum;
			var toHeaderDiv = 'legend_header_' + toDivNum;
			var toBodyDiv = 'legend_div_' + toDivNum;			
			
			// Move content from source to destination.
			// N.B. The following statements also remove the contents of the 'from' divs
			$('#' + toHeaderDiv).html($('#' + fromHeaderDiv).contents());
			$('#' + toBodyDiv).html($('#' + fromBodyDiv).contents());
			
			var fromDivNumStr = fromDivNum + '';
			var toDivNumStr = toDivNum + '';
			var fromKind = divState[fromDivNumStr].name;
			
			// Bookkeeping
			legendNameToDiv[fromKind] = toDivNum;
			divState[toDivNumStr].populated = true;
			divState[toDivNumStr].name = fromKind;
			
			var _DEBUG_HOOK = 0;
		} // shuffleLegend()

		var api = {
			addLegend 	: function(legendName, header, graphic) {
				if (nextAvailDiv > maxLegendDiv) {
					console.log('Attempt to exceed max number of legends.');
					return;
				}
				console.log('Addding legend: ' + legendName);
				
				// *** TBD: Defensive programming: Check for legal legendName
				var divNum = nextAvailDiv++;
				var wrapperDiv = 'legend_wrapper_' + divNum;
				var headerDiv = 'legend_header_' + divNum;
				var bodyDiv = 'legend_div_' + divNum;
						
				$('#' + headerDiv).html(header);
				$('#' + bodyDiv).html(graphic);
				
				// Bookkeeping
				legendNameToDiv[legendName] = divNum;
				var divNumStr = divNum + '';
				divState[divNumStr].populated = true;
				divState[divNumStr].name = legendName;
				
				console.log('\t ' + legendName + ' added to div ' + divNumStr );
			},
			removeLegend : function(legendName) {
				// This API is under development. -- BK 04/03/18	
				// *** TBD: Defensive programming: Check for legal legendName
				
				var divNum = legendNameToDiv[legendName];
				if (divNum === 0) {
					// Before a new layer of a given type is added to the map, a function named
					// clearXXXLayers (where XXX is the given layer type) is called to ensure
					// that a layer of the given type is not present in the map. This, in turn,
					// calls "removeLegend" to remove any associated legend.
					// Hence, this code.
					return;
				}
				console.log('Removing legend: ' + legendName + ' from div ' + divNum);
				
				var divNumStr = divNum + '';
				legendNameToDiv[legendName] = 0;
				var wrapperDiv = 'legend_wrapper_' + divNum;
				var headerDiv = 'legend_header_' + divNum;
				var bodyDiv = 'legend_div_' + divNum;
				
				$('#' + headerDiv).html('');
				$('#' + bodyDiv).html('');
				
				divState[divNumStr].populated = false;
				divState[divNumStr].name = '';

				// Do the legend shuffle
				var numShuffles = (nextAvailDiv - 1) - divNum;
				var toDiv   = divNum;
				var fromDiv = divNum + 1;
				var i;
				for (i = 0; i < numShuffles; i++) {
					shuffleLegend(fromDiv, toDiv);
					fromDiv++;
					toDiv++;
				}
				// Update state for "next available div": div number and leftMargin
				nextAvailDiv = nextAvailDiv - 1;
			},
			_dev : function() {
				var _HOOK = 0;
			}
		};
		return api;
	})(); 
	
	// On-click handler to toggle visibility of the div containing the map legend.
	$('#toggle_legends').click(function(e) {
		var d = $('#map_legend_wrapper');
		if (d.hasClass('hidden')) {
			// $(this).html('Close Map Legend');
			d.removeClass('hidden');
			d.addClass('unhidden');
		} else if (d.hasClass('unhidden')) { // Just to be sure :-)
			// $(this).html('Open Map Legend');
			d.removeClass('unhidden');
			d.addClass('hidden');
		}
	});
	
	// Utility function to generate the URL for WFS getLegendGraphic requests.
	var makeLegendGraphicUrl = function(layer, style) {
		retval = "<img ";
		retval += " src=\'";
		retval += CTPS.lrtpApp.szWMSserverRoot + '?';
		retval += "request=getlegendgraphic&version=1.0.0&format=image/png&width=20&height=20&";
		retval += "layer=" + layer + "&";  
		retval += "style=";
		retval += style; 
		retval += "\'></img>";
		return retval;
	};
	
	// On-click event handler to show/hide fieldsets for tabular socioeconomic/demographic data,
	// corridor-specific, and regional tabular transportation data.
	// The function of this handler is to logically treat these three fieldsets as a single set
	// of "radio buttons", at most only one of which can be exposed (i.e., "on") at any one time.
	//
	$('#table_socioeconomic,#table_transportation,#table_transportation_all').click(function(e) {
		switch (this.id) {
		case 'table_socioeconomic':
			// Toggle visibility of socioeconomic fieldset.
			if ($('#socioeconomic_table').hasClass('hidden')) {
				$('#socioeconomic_table').removeClass('hidden');
				$('#socioeconomic_table').addClass('unhidden');
			} else if ($('#socioeconomic_table').hasClass('unhidden')) {
				$('#socioeconomic_table').removeClass('unhidden');
				$('#socioeconomic_table').addClass('hidden');			
			}
			// Hide the other two fieldsets.
			if ($('#transportation_table').hasClass('unhidden')) {
				$('#transportation_table').removeClass('unhidden');
				$('#transportation_table').addClass('hidden');
			}		
			if ($('#transportation_table_all').hasClass('unhidden')) {
				$('#transportation_table_all').removeClass('unhidden');
				$('#transportation_table_all').addClass('hidden');
			}
			break;
		case 'table_transportation':
			// Toggle visibility of corridor-specific transportation data fieldset.
			if ($('#transportation_table').hasClass('hidden')) {
				$('#transportation_table').removeClass('hidden');
				$('#transportation_table').addClass('unhidden');
			} else if ($('#transportation_table').hasClass('unhidden')) {
				$('#transportation_table').removeClass('unhidden');
				$('#transportation_table').addClass('hidden');			
			}
			// Hide the other two fieldsets.
			if ($('#socioeconomic_table').hasClass('unhidden')) {
				$('#socioeconomic_table').removeClass('unhidden');
				$('#socioeconomic_table').addClass('hidden');
			}		
			if ($('#transportation_table_all').hasClass('unhidden')) {
				$('#transportation_table_all').removeClass('unhidden');
				$('#transportation_table_all').addClass('hidden');
			}		
			break;
		case 'table_transportation_all':
			// Toggle visibility of regionwide transportation data fieldset.
			if ($('#transportation_table_all').hasClass('hidden')) {
				$('#transportation_table_all').removeClass('hidden');
				$('#transportation_table_all').addClass('unhidden');
			} else if ($('#transportation_table_all').hasClass('unhidden')) {
				$('#transportation_table_all').removeClass('unhidden');
				$('#transportation_table_all').addClass('hidden');			
			}
			// Hide the other two fieldsets.
			if ($('#socioeconomic_table').hasClass('unhidden')) {
				$('#socioeconomic_table').removeClass('unhidden');
				$('#socioeconomic_table').addClass('hidden');
			}		
			if ($('#transportation_table').hasClass('unhidden')) {
				$('#transportation_table').removeClass('unhidden');
				$('#transportation_table').addClass('hidden');
			}		
			break;
		default:
			break;
		}
	});

	// Utilty function to clear the 'corridor' map layer.
	// N.B. This function was misnamed by my predecessor as 'clearSubregionWinsows.'
	// It has has nothing to do with either (MAPC) subregions (not used in this app) or with windows.
	//
	var clearCorridorLayer = function(){
		CTPS.lrtpApp.oWindowRadial.setVisible(false);
		CTPS.lrtpApp.oWindowCore.setVisible(false); 
	};
	
	// Utility function to clear all demographic (WMS and vector) map layers.
	//
	var clearDemographicLayers = function() {
		CTPS.lrtpApp.oTAZ.setVisible(false);
		CTPS.lrtpApp.oTAZ_donut.setVisible(false);
		legendManager.removeLegend('demographic');
	};
	
	// Utility function to clear all transporatation infrastructure layers.
	//
	var clearInfrastructureLayers = function() {
		var params = CTPS.lrtpApp.oRoads.getSource().getParams();
		params['STYLES'] = 'RoadsMultiscaleGroupedBG';
		CTPS.lrtpApp.oRoads.getSource().updateParams();
		CTPS.lrtpApp.oRoads.setZIndex(2);		// low value = close to bottom of stack for BASE LAYER (moved up when that becomes the clicked layer)
		CTPS.lrtpApp.oRoads.setVisible(true);
		CTPS.lrtpApp.oPavement.setVisible(false);
		CTPS.lrtpApp.oTruckGen.setVisible(false);
		CTPS.lrtpApp.oRailFreight.setVisible(false);
		CTPS.lrtpApp.oRT.setVisible(false);  
		CTPS.lrtpApp.oCR.setVisible(false);
		CTPS.lrtpApp.oPorts_PkRide.setVisible(false);
		CTPS.lrtpApp.oFerries.setVisible(false);
		CTPS.lrtpApp.oBikes.setVisible(false);  
		CTPS.lrtpApp.oHighlightLayerBus.setVisible(false);		
		legendManager.removeLegend('infrastructure');
		//
		// Clear and hide combo box for bus routes
		$('#route_name').val(0);
		$('#drop_list').hide();
	}; 
	
	// Utility function to clear all crash layers.
	var clearCrashLayers = function() {
		CTPS.lrtpApp.oCrashes.setVisible(false);
		CTPS.lrtpApp.oBikeCrashes.setVisible(false);
		CTPS.lrtpApp.oPedCrashes.setVisible(false);		
		legendManager.removeLegend('crash');
	};

	// Utility function to clear all Voc layers.
	var clearVocLayers = function() {
		CTPS.lrtpApp.oVOC.setVisible(false);	
		legendManager.removeLegend('voc');
	};	
	
	// Utility function to hide all truck trip-density layers.
	var clearTruckLayers = function() {
		CTPS.lrtpApp.oTAZ_trucks.setVisible(false);
		legendManager.removeLegend('truck');
	};	
	
	// Utility function that was somewhat mis-named.
	// It does not clear all Accessible grid *objects*, 
	// but rather accessible HTML grids (which were
	// generated by calling the AccessibleGrid constructor.)
	// Clear?
	//
	var clearAllGrids = function(){
		$('#pop_grid').html('');
		$('#hh_grid').html('');
		$('#emp_grid').html('');
		$('#eld_grid').html(''); 
		$('#other_demog_grid').html('');
		$('#crash_grid').html('');
		$('#VOC_grid').html('');      
		$('#spd_idx_grid').html('');
		$('#tt_grid').html('');
		$('#CRStn_grid').html('');
		$('#airport_grid').html('');
		$('#PRlots_grid').html('');
		$('#boatdocks_grid').html('');  
		$('#bikes_grid').html('');
	};
	
	// Mysterious legacy gift - sans comments - from Mlle. MMcS:
	//
	//	var $firstPara = $('p');          // either this or the exposed version just below works:
	//	$firstPara.hide();                // sets all 'p' elements to be hidden when page loads
	$('p').hide();

	$('li a').click(function(){           // function triggers opening and closing of 'p' elements when topic link clicked 
		var $link = $(this);                    
		$link.parent()
			.find('p')
			.animate(
				{
					// $firstPara.animate({   // using this line instead of above (starting with $link=this) 
					height: 'toggle',		  // opens & closes ALL elements within a group, not just the child elements         
					opacity: 'toggle'
				}, 
				100
			);       
		return false; 
	 });

	//  Clear whatever demographic data layer (and its legend) might be visibile.
	//
	$('#Demographic_clear').click(function(){   
		clearDemographicLayers();
		$('#selected_demographic_layer').val(0);
		CTPS.lrtpApp.oHighlightLayerTAZ.getSource().clear();
		CTPS.lrtpApp.oHighlightLayerTowns.getSource().clear();
		legendManager.removeLegend('demographic');
		// Not sure why the following line is here - legacy gift from Mary.
		CSSClass.add('mytabs');  
	}); 
	//  Clear relevant class of transportation layers.
	//	
	$('#Infrastructure_clear').click(function() { 
		clearInfrastructureLayers();
		$('#selected_transportation_layer').val(0);
	});
	$('#Crash_clear').click(function() { 
		clearCrashLayers();
		$('#selected_crash_layer').val(0);
	});	
	$('#VOC_clear').click(function() { 
		clearVocLayers();
		$('#selected_voc_layer').val(0);
	});
	$('#Truck_clear').click(function() { 
		clearTruckLayers();
		$('#selected_truck_layer').val(0);
	});

	// Clear all map layers.
	//
	$('#all_clear_map').click(function(){  
		// Clear selected town vector layer.
		CTPS.lrtpApp.oHighlightLayerTowns.getSource().clear();
		// Clear the layer with the selected corridor - which may be either radial or circumferential.
		CTPS.lrtpApp.oWindowRadial.setVisible(false);
		CTPS.lrtpApp.oWindowCore.setVisible(false);
		$('#Demographic_clear').click(); // Hey, it works ... 
		$('#Infrastructure_clear').click();
		$('#Crash_clear').click();
		$('#VOC_clear').click();
		$('#Truck_clear').click();
	});
	
	// Launch origin-destination page in new window.
	// 
	$('#main_OD').click(function(){  
		window.open('../OD_page/OD_page.html','_blank');
	});    
	// Launch Boston trips page in new window.
	// 	
	$('#second_OD').click(function(){  
		window.open('../Boston_trips/boston_trips.html','_blank');
	});
	
	// On-click event handlers for buttons on top of map.
	//
	$('#About').click(function(){
		window.open('about_text.html','_blank','height=750,width=900,left=200,top=10,resizable=yes,scrollbars=yes,toolbar=no,menubar=no,location=no,directories=no,status=yes');      
	});
	$('#Help').click(function(){
		window.open('help_text.html','_blank','height=750,width=900,left=200,top=10,resizable=yes,scrollbars=yes,toolbar=no,menubar=no,location=no,directories=no,status=yes');      
	});
	$('#Comment').click(function(){
		window.open('http://www.ctps.org/contact','_blank');      
	});
	
	// Pan/zoom map to selected corridor.
	//
	//  On-change event handler for "corridor" (for some reason Mary called it "subregion") combo box.
	//  Grabs the name of the corridor, saves it in "CTPS.lrtpApp.chosen_entity" (why this is done isn't clear),
	//  and pans/zooms map to selected corridor.
	//
	//  Mary's legacy comment said that this function "responds to value passed to page as cookie from calling
	//  link, and read as 'CTPS.lrtpApp.myCorridor'. It is not clear what was meant by this.
	//
	$("#selected_corridor").change(function() { 
		// Get selected corridor from combo box   
		if ($('#selected_corridor :selected').index == 0) {
				return;
		}
		var region_abbrev = $('#selected_corridor :selected').val();
		var region_txt = $('#selected_corridor :selected').text();
		CTPS.lrtpApp.chosen_entity = region_abbrev;              
		displayCorridor();		
	});
	// TBD: ??? Not sure why Mary made this into a function, rather than in-lining it above at the (single) call site.
	//      Maybe she anticipated it being called from elsewhere?
	//
	// Mary's comment:
	// 	Uses value input from either combo box or cookie to get subregion extent, new style, & zoom level and display.
	// 
	// TBD: ??? Determine what this "cookie" business is about.
	//
	// The logic in this function is rather squirrel-ly, as the function has been rigged to perform
	// three logically distinct things:
	// 		1. Display a RADIAL corridor, i.e., one in the 'corridors' layer, including panning/zooming the map to it.
	//		2. Display the TWO central CIRCUMFERENTIAL corridors (i.e., the 'BOS' and 'CEN' corridors), including
	//         panning/zooming the map to it. We note that the bounding box of the 'CEN' corridor encompasses that
	//         of the 'BOS' corridor, and consequently issue a WFS reuqest to just get data for the 'CEN' corridor.
	//      3. Panning/zooming the map to the "Region" (which one might think means "the MPO region"), but which
	//         in fact means "the original extent of the OpenLayers map in this app."
	//
	// At some point, it would be good to untangle all of this, but for the time being it will have to suffice
	// to "make it work." 
	//
	// Your humble narrator apologizes if the code below induces some gastrointestinal distress in the reader.	
	//
	var displayCorridor = function(){
		if (!CTPS.lrtpApp.chosen_entity) {									//  i.e., if combo box empty or not activated         
            if(CTPS.lrtpApp.myCorridor===null) {							//  AND if ..myCorridor is null (no cookie read in)
				alert("NO Entity Selected--TRY AGAIN");
				return;
            } else {
				// Use value passed in as cookie to select and display subregion
				CTPS.lrtpApp.chosen_entity = CTPS.lrtpApp.myCorridor;
			};
		};
		// Turn offf corridor layers.
		clearCorridorLayer();
		// If 'Region' was selected, just clear whatever 'corridor' layer is visible,
		// pan/zoom map to original extent, and return.
		if (CTPS.lrtpApp.chosen_entity === 'Region') {
			// The following statement is meaningful only if the previously selected corridor was 'Core'.
			CTPS.lrtpApp.oWindowCore.setVisible(false);
			CTPS.lrtpApp.oWindowCore.setZIndex(100);	//set to be on top of all other layers when visible										
			bbox = CTPS.lrtpApp.initialExtent;
			CTPS.lrtpApp.map.getView().fit( bbox, 
										   { size: CTPS.lrtpApp.map.getSize(),
										     duration: 2000 } );
			return;
		}
		var wfsLayer;
		var cql_Filter = '';
		if (CTPS.lrtpApp.chosen_entity === 'Core') {;
			wfsLayer = PLAN.gs_layers.central_corr;
			cql_Filter = "(circumferential_corridor=='CEN')";
		} else {
			wfsLayer = PLAN.gs_layers.corridors;
			cql_Filter = "(corridor=='" + CTPS.lrtpApp.chosen_entity + "')";
		}	
		var szUrl = CTPS.lrtpApp.szWFSserverRoot + '?';
		szUrl += '&service=wfs&version=1.0.0&request=getfeature';
		szUrl += '&typename=' +  wfsLayer;
		szUrl += '&outputformat=json';
		szUrl += '&cql_filter=' + cql_Filter;
		$.ajax({ url		: szUrl,
				 type		: 'GET',
				 dataType	: 'json',
				 success	: 	function (data, textStatus, jqXHR) {
									var reader = new ol.format.GeoJSON();
									var aFeatures = reader.readFeatures(jqXHR.responseText);
									if (aFeatures.length != 1) {
										console.log('Something is amiss in WFS response in displayCorridor().');
										return;
									};
									var attrs = aFeatures[0].getProperties();
									var bbox = attrs.geometry.getExtent();
									var new_style;
									var params;
									if (CTPS.lrtpApp.chosen_entity !=='Core') {
										new_style = 'Dest2040_corridor_' + CTPS.lrtpApp.chosen_entity;                
										params = CTPS.lrtpApp.oWindowRadial.getSource().getParams();
										params['STYLES'] = new_style;

										CTPS.lrtpApp.oWindowRadial.setVisible(false);
										CTPS.lrtpApp.oWindowRadial.getSource().updateParams();
										CTPS.lrtpApp.oWindowRadial.setVisible(true);
										CTPS.lrtpApp.oWindowRadial.setZIndex(100);	//set to be on top of all other layers when visible
									} else {
										// Here: CTPS.lrtpApp.chosen_entity === 'Core'
										new_style = 'Dest2040_corridor_Central';
										params = CTPS.lrtpApp.oWindowCore.getSource().getParams();
										params['STYLES'] = new_style;
										CTPS.lrtpApp.oWindowCore.setVisible(false);
										CTPS.lrtpApp.oWindowCore.getSource().updateParams();
										CTPS.lrtpApp.oWindowCore.setVisible(true);
										CTPS.lrtpApp.oWindowCore.setZIndex(100);	//set to be on top of all other layers when visible
									} 
									// Pan/zoom to selected corridor
									CTPS.lrtpApp.map.getView().fit( bbox, 
																	{ size: CTPS.lrtpApp.map.getSize(),
																	  duration: 2000 } );
								},  
				 failure	: 	function (qXHR, textStatus, errorThrown ) {
									alert('WFS request to search for corridor failed.\n' +
											'Status: ' + textStatus + '\n' +
											'Error:  ' + errorThrown);
								}
		}); 	
    }; // displayCorridor()
	
	// Display demographic ('socioeconomic') map layer.
	//
	// On-change event handler for combo box to select demographic map layer.
	//
	// Not clear why out-of-line function is called to render the map layer in question, rather than
	// in-lining the relevant code. In case Mary envisiond this functionality being called from elesewhere,
	// and this becomes apparent later, I'm keeping things as I found them.
	//
	$('#selected_demographic_layer').change(function(e) {
		if ($('#selected_demographic_layer :selected').index() == 0) {
			clearDemographicLayers();
			return;
		}
		var selectedLayer = $('#selected_demographic_layer :selected').val();
		getSEData(selectedLayer);
	});
	var getSEData = function(item) {	     
		var new_style, szLegendHeader, layer_used, OL_layer, params, szUrl2; 
		clearDemographicLayers(); 
 
		new_style = PLAN.map_layers[item].sld;
		szLegendHeader = PLAN.map_layers[item].legendHeader;
		layer_used = PLAN.map_layers[item].gsLayer;
		OL_layer = PLAN.map_layers[item].olLayer;
		
		// Update layer style, make visible
		params = CTPS.lrtpApp[OL_layer].getSource().getParams();
		params['STYLES'] = new_style;
		CTPS.lrtpApp[OL_layer].getSource().updateParams();
		CTPS.lrtpApp[OL_layer].setVisible(true);
		
		szUrl2 = makeLegendGraphicUrl(layer_used, new_style); 		 
		legendManager.addLegend('demographic', szLegendHeader, szUrl2);
	}; // getSEData()
	
	// Display transportation data map layer.
	//
	// On-change event handler for combo box to select transportation map layer.
	//
	// Again, not clear why out-of-line function call was being made, but keeping
	// things as I found them in case there turns out to be a good reason for this.
	//
	// *** Same questions/comments as above re: (1) inlining body of fn called by event handler, 
	//     and (2) the "cookie"
	//
	// NOTE: There is a separate function, immediately below "displayInfrastructureData", to display a single bus route.
	//
	$('#selected_transportation_layer,#selected_truck_layer,#selected_voc_layer,#selected_crash_layer').change(function(e) {
		var comboBox = this.id;
		if (this.selectedIndex === 0) {
			// Clear any visible map layer and legend
			switch(comboBox) {
			case 'selected_transportation_layer':
				clearInfrastructureLayers();
				break;
			case 'selected_truck_layer':
				clearTruckLayers();
				break;
			case 'selected_voc_layer':
				clearVocLayers();
				break;
			case 'selected_crash_layer':
				clearCrashLayers();
				break;
			default:
				break;
			}
		} else {
			var selectedLayer = this.value;
			switch(comboBox) {
			case 'selected_transportation_layer':
				displayInfrastructureLayer(selectedLayer);
				break;
			case 'selected_truck_layer':
				displayTruckLayer(selectedLayer);
				break;
			case 'selected_voc_layer':
				displayVocLayer(selectedLayer);
				break;
			case 'selected_crash_layer':
				displayCrashLayer(selectedLayer);
				break;
			default:
				break;
			}
		}
		return;
	});	
	
	// Uses identified transportation infrastructure layer (from select box OR passed cookie) to get parameters
	// for that layer from the (formerly) separate PLAN.js file, and display layer on map. 
    var displayInfrastructureLayer = function(item) {
		clearInfrastructureLayers();
		// Display bus drop_list if, in fact, 'buses' was chosen.  
		if (item=='buses') {
			$('#drop_list').show();
		};
     
        var new_style, params, szLegendHeader, layer_used, OL_layer, szUrl2;
		
		// A bit of pretzel logic grandfathered in here for the sake of expediency:
		//
		// There is no entry in the PLAN.map_layers k-v table for the "busses" layer.
		// This layer is styled dynamically as an OL Vector layer, not using an SLD.
		// So, per grandfathered-in pretzel logic, we bypass the following assignment
		// statements if item == "buses".
		//
		// To cleaned up (hopefully) if we have some time after the app is up and running.
		//
		// -- BK 01/31/2018
		if (item != "buses") {
			new_style = PLAN.map_layers[item].sld;
			szLegendHeader = PLAN.map_layers[item].legendHeader + '<br/>';
			layer_used = PLAN.map_layers[item].gsLayer;
			OL_layer = PLAN.map_layers[item].olLayer;
		}

		switch(OL_layer){
		case 'oRoads':
				params = CTPS.lrtpApp[OL_layer].getSource().getParams();
				params['STYLES'] = new_style;
				CTPS.lrtpApp[OL_layer].getSource().updateParams();
				CTPS.lrtpApp[OL_layer].setVisible(true);
				CTPS.lrtpApp[OL_layer].setZIndex(99);
				break;
		case 'oCR':
		case 'oPorts_PkRide':
		case 'oBikes':
		case 'oPavement':
		case 'oRT':
		case 'oFerries':
		case 'oTruckGen':
		case 'oRailFreight':
			// Just make the layer visible
			CTPS.lrtpApp[OL_layer].setVisible(true);
			CTPS.lrtpApp[OL_layer].setZIndex(99);
			break;
		default:
			break;
		};	
				
		// Set up WFS reguqest to generate legend graphic.	
		if (item === 'airports_etc' || item === 'CR' || item == 'highway') {
			// Custom, hand-crafted legend graphic	
			szUrl2 = PLAN.custom_legends[item];
		} else {
			szUrl2 = makeLegendGraphicUrl(layer_used, new_style); 
		}
		legendManager.removeLegend('infrastructure');
        if(!(item=='buses')){
			legendManager.addLegend('infrastructure', szLegendHeader, szUrl2);
        };
    }; // displayInfrastructureLayer()
	
	// On-change event handler for combo box for selected MBTA bus route.
	// Function responds to change in combo box to select bus route, put in Vector Layer,
	// and highlight on screen. 
	//
	$('#route_name').change(function() {
		var myselect = document.getElementById("route_name");
		var j;
		for(j=0;j<myselect.options.length;j++){
			if(myselect.options[j].selected==true){
				var realwords = myselect.options[j].innerHTML;
				break;
			};
		}; 
		var i = realwords.indexOf(',',0);
		var route_no = realwords.substring(0,i);
		var szSearchForMe = route_no;
		if (szSearchForMe === '') { 
			return;
			// Should never get here.
			alert("No route selected; try again.");
			return;
		};
		// Create WFS request to get data to display selected bus route on map.
		var cql_Filter = "(ctps_route=='" + szSearchForMe + "')";
		var szUrl = CTPS.lrtpApp.szWFSserverRoot + '?'; 
		szUrl += '&service=wfs&version=1.0.0&request=getfeature';     
		szUrl += '&typename=' + PLAN.gs_layers.bus_routes;
		szUrl += '&outputformat=json';
		szUrl += '&cql_filter=' + cql_Filter;
		$.ajax({ url		: szUrl,
				 type		: 'GET',
				 dataType	: 'json',
				 success	: 	function (data, textStatus, jqXHR) {	
									var reader = new ol.format.GeoJSON();
									var aFeatures = reader.readFeatures(jqXHR.responseText);
									if (aFeatures.length === 0) {
										alert('Error: No bus route with that name found.');
										return;
									};
									
									// Generate Bus Route and associated caption
									var szResponse = '', caption,attrs, i;
									var source = CTPS.lrtpApp.oHighlightLayerBus.getSource();

									for (i = 0; i < aFeatures.length; i++) {				
										attrs = aFeatures[i].getProperties();
										if (i===0) {
											szResponse = attrs['ctps_route_text'];
											caption = attrs['route_name'];     
										};
										// clear here because only want to display route once, no need for both directions to be visibile
										CTPS.lrtpApp.oHighlightLayerBus.getSource().clear();
										source.addFeature(new ol.Feature(attrs));
									};
									CTPS.lrtpApp.oHighlightLayerBus.setVisible(true);
									CTPS.lrtpApp.oHighlightLayerBus.setZIndex(99);
									szLegendHeader = 'MBTA Bus Route:';
									legendManager.addLegend('infrastructure', szLegendHeader, szResponse + ' -- ' + caption);
									// Pan/zoom to selected bus route
									CTPS.lrtpApp.map.getView().fit(
										attrs.geometry.getExtent(),
										{ size: CTPS.lrtpApp.map.getSize(),
										  duration: 1500 }
									);
								},  
				failure		: 	function (qXHR, textStatus, errorThrown ) {
									alert('WFS request in to get MBTA bus route data failed.\n' +
											'Status: ' + textStatus + '\n' +
											'Error:  ' + errorThrown);
								}
		});
	}); // On-change event handler for combo box of MBTA bus routes.	
	
	var displayCrashLayer = function(item) {
		var new_style, params, szLegendHeader, layer_used, OL_layer, szUrl2;
		
		clearCrashLayers();
		new_style = PLAN.map_layers[item].sld;
		szLegendHeader = PLAN.map_layers[item].legendHeader + '<br/>';
		layer_used = PLAN.map_layers[item].gsLayer;
		OL_layer = PLAN.map_layers[item].olLayer;
		
		params = CTPS.lrtpApp[OL_layer].getSource().getParams();
		params['STYLES'] = new_style;
		CTPS.lrtpApp[OL_layer].getSource().updateParams();
		CTPS.lrtpApp[OL_layer].setVisible(true);
		CTPS.lrtpApp[OL_layer].setZIndex(99);

		switch(item) {
		case 'crashes':
			szUrl2 = makeLegendGraphicUrl(PLAN.gs_layers.crash_layer_poly, 'Dest2040_crash_gen_poly_1color'); 
			break;
		case 'bike_crashes':  
			szUrl2 = makeLegendGraphicUrl(PLAN.gs_layers.crash_bikes_poly, 'Dest2040_crash_bike_poly_1color');  
			break;
		case 'ped_crashes':   
			szUrl2 = makeLegendGraphicUrl(PLAN.gs_layers.crash_peds_poly, 'Dest2040_crash_ped_poly_1color'); 
			break;
		default:
			break;
		}
		legendManager.removeLegend('crash');
		legendManager.addLegend('crash', szLegendHeader, szUrl2);
	}; // displayCrashLayer()	
	
	var displayVocLayer = function(item) {
		var new_style, params, szLegendHeader, layer_used, OL_layer, szUrl2;
		
		clearVocLayers();
		new_style = PLAN.map_layers[item].sld;
		szLegendHeader = PLAN.map_layers[item].legendHeader + '<br/>';
		layer_used = PLAN.map_layers[item].gsLayer;
		OL_layer = PLAN.map_layers[item].olLayer;
		
		params = CTPS.lrtpApp[OL_layer].getSource().getParams();
		params['STYLES'] = new_style;
		CTPS.lrtpApp[OL_layer].getSource().updateParams();
		CTPS.lrtpApp[OL_layer].setVisible(true);
		CTPS.lrtpApp[OL_layer].setZIndex(99);
		
		szUrl2 = makeLegendGraphicUrl(layer_used, new_style); 
		legendManager.removeLegend('voc');
		legendManager.addLegend('voc', szLegendHeader, szUrl2);	
	}; // displayVocLayer()
	
	var displayTruckLayer = function(item) {
		var new_style, params, szLegendHeader, layer_used, OL_layer, szUrl2;
		
		clearTruckLayers();
		new_style = PLAN.map_layers[item].sld;
		szLegendHeader = PLAN.map_layers[item].legendHeader + '<br/>';
		layer_used = PLAN.map_layers[item].gsLayer;
		OL_layer = PLAN.map_layers[item].olLayer;
		
		params = CTPS.lrtpApp[OL_layer].getSource().getParams();
		params['STYLES'] = new_style;
		CTPS.lrtpApp[OL_layer].getSource().updateParams();
		CTPS.lrtpApp[OL_layer].setVisible(true);
		CTPS.lrtpApp[OL_layer].setZIndex(99);
		
		szUrl2 = makeLegendGraphicUrl(PLAN.gs_layers.taz2727_trucks, new_style); 
		legendManager.removeLegend('truck');
		legendManager.addLegend('truck', szLegendHeader, szUrl2);
	}; // displayTruckLayer()	
	
	// On-click event handler for "searchForTown" button.
	// 
	$('#searchForTown').click(function() {
		// Get name of selected city or town from combo box 
		if ($('#selected_town :selected').index() === 0) {
			return;
		}
		var townVal = $('#selected_town :selected').val();
		// var townText = $('#selected_town :selected').text();
			
		CTPS.lrtpApp.oHighlightLayerTowns.setVisible(true);
				
		var szChangeCaseUpper = townVal.toUpperCase()
		var cql_Filter = "(town=='" + szChangeCaseUpper + "')";
		var szUrl = CTPS.lrtpApp.szWFSserverRoot + '?';
		szUrl += '&service=wfs&version=1.0.0&request=getfeature';
		szUrl += '&typename=' +  PLAN.gs_layers.towns_layer;
		szUrl += '&outputformat=json';
		szUrl += '&cql_filter=' + cql_Filter; 
		$.ajax({ url		: szUrl,
				 type		: 'GET',
				 dataType	: 'json',
				 success	: 	function (data, textStatus, jqXHR) {
									var reader = new ol.format.GeoJSON();
									var aFeatures = reader.readFeatures(jqXHR.responseText);
									if (aFeatures.length === 0) {
										alert("?? No town found-- \n add a town name to box, or check \nspelling of town name you entered.");
										return;
									};
									//Remove existing features
									CTPS.lrtpApp.oHighlightLayerTowns.getSource().clear();
									// Add Highlight Layer
									var attrs = aFeatures[0].getProperties();
									CTPS.lrtpApp.oHighlightLayerTowns.getSource().addFeature(new ol.Feature(attrs));
									// Pan/zoom to selected corridor
									CTPS.lrtpApp.map.getView().fit(
										attrs.geometry.getExtent(), 
										{ size: CTPS.lrtpApp.map.getSize(),
										  duration: 2000 }
									);
									$('#getSETable').show();
									$('#downloadSEData').hide();
									$('#clearSETable').hide();
								},  
				 failure	: 	function (qXHR, textStatus, errorThrown ) {
									alert('WFS request to search for city or town failed.\n' +
											'Status: ' + textStatus + '\n' +
											'Error:  ' + errorThrown);
								}
		});     
	}); // On-click event handler for "searchForTown" button.
	
	// On-click handler that responds to clear data button, clears towns from highlight layer and clears data tables.
	$('#all_clear_tables, #clearSETable, #clearTRTable, #clearTRRegionTable').click(function(){
		CTPS.lrtpApp.oHighlightLayerTowns.getSource().clear();	
		CTPS.lrtpApp.oHighlightLayerTAZ.getSource().clear();

		$('#townName').val('');
		$('#table_subregion').val('');

		$('#getSETable, #downloadSEData, #clearSETable').hide();                                                
		$('#downloadTRRegionwideData,#clearTRRegionTable').hide();

		if($('#getTableTR').attr('class')==='unhidden2'){
			unhideLine('getTableTR');
		};

		if($('#downloadTRData').attr('class')==='unhidden2'){
			unhideLine('downloadTRData');
		};

		if ($('#clearTRTable').attr('class')==='unhidden2'){
			unhideLine('clearTRTable');	
		};

		CSSClass.add('mytabs');
		CSSClass.add('mytabs2');
		CSSClass.add('mytabs3');
	});	// On-click event handler to clear data tables and highlight map layer.
	
	// On-click handler for button to get socioeconomic data tables.
	//
    $('#getSETable').click(function(){
		// This function is called when the button with id "getSETable" is clicked.
		// The "getSETable" button isn't made visible until a town has been selected 
		// from the <select> control with id "selected_town." Selecting a town from
		// this <select> list and then clicking the button with id "searchForTown"
		// will put a single town into the CTPS.lrtpApp.oHighlightLayerTowns 
		// OL vector layer. The single feature in this list is, then, effectively
		// how this function has been parameter-arized.
		// -- BK 02/06/2018
		
		// Assert: aFeatures.length === 1
        if(CTPS.lrtpApp.oHighlightLayerTowns.getSource().getFeatures().length !== 1){
			alert('Zero or more than municipality selected for query.\nSelect a municipality from the drop-down list, and try again.');
			return;
        };
       
        CTPS.lrtpApp.oHighlightLayerTAZ.getSource().clear();
        $('#downloadSEData').show();
        $('#clearSETable').show();
        clearAllGrids();
	
        var cql_Filter = '', id, townname, townProper, aFeatures, tems_SE, szUrl;

		// The interface to this routine has been changed so that only 1 town can be specified.
		aFeatures = CTPS.lrtpApp.oHighlightLayerTowns.getSource().getFeatures();
		id = aFeatures[0].getProperties().town_id;	
		townname = aFeatures[0].getProperties().town;	
		townProper = toTitleCase(townname);
		cql_Filter += '(town_id==' + id + ')';

		// *** TBD: Note database field is "emp_sqmi_2010" rather than "emp_psqmi_2010" as one would expect!!
		// ***      DB table column name needs to be changed.
		//
		// -- BK 01/31/2018
		//
        items_SE = "town,taz,pop_psqmi_2010,emp_sqmi_2010,hh_psqmi_2010,pop_psqmi_2040,emp_psqmi_2040,hh_psqmi_2040,";
		items_SE += "pop_psqmi_change_2010_2040,emp_psqmi_change_2010_2040,hh_psqmi_change_2010_2040,";
		items_SE += "pop_75plus_pct_2010,pop_u18_pct_2010,";
		items_SE += "minority_pop_pct_2010,lep_pop_pct_2010,disabled_pop_pct_2010,lowinc_hh_pct_2010";

		szUrl = CTPS.lrtpApp.szWFSserverRoot + '?';
		szUrl += '&service=wfs&version=1.0.0&request=getfeature';     
		szUrl += '&typename=' + PLAN.gs_layers.taz2727;
		szUrl += '&outputformat=json';
		szUrl += '&cql_filter=' + cql_Filter;
		// For now, get all properties; ignore "items_SE" property list, above.
		// szUrl += '&propertyname=' + items_SE;
		$.ajax({ url		: szUrl,
				 type		: 'GET',
				 dataType	: 'json',
				 success	: 	function (data, textStatus, jqXHR) {	
									var reader = new ol.format.GeoJSON();
									var aFeatures = reader.readFeatures(jqXHR.responseText);
									if (aFeatures.length === 0) {
										alert('No features found, possibly because \ntown outside Plan area');       
										$('#clearSETable').click();
										return;
									};
									// Load, Populate Table Data Stores
									var k, attrs, myData = [], myData2 = [], myData3 = [];
									var popGrid = {}, hhGrid = {}, empGrid = {};
									for (k = 0; k < aFeatures.length; k++) {
										attrs = aFeatures[k].getProperties();
										// Population
										myData[k] = {      
											'TAZ'				: +attrs['taz'],
											'TOWN'				: townProper,
											'POP_2010'			: (+(attrs['total_pop_2010'].toFixed(0))).toLocaleString(),
											'POP_PSQMI_2010'	: (+(attrs['pop_psqmi_2010'].toFixed(0))).toLocaleString(),											
											'POP_U18_2010'		: (+(attrs['total_pop_u18_2010'].toFixed(0))).toLocaleString(),
											'PCT_UNDER_18'    	: ((+attrs['pop_u18_pct_2010']*100).toFixed(1)).toLocaleString(),
											'POP_75PLUS_2010'	: (+(attrs['total_pop_75plus_2010'].toFixed(0))).toLocaleString(),
											'PCT_OVER_75'		: ((+attrs['pop_75plus_pct_2010']*100).toFixed(1)).toLocaleString(),										
											'POP_MINORITY_2010'	: (+(attrs['total_minority_pop_2010'].toFixed(0))).toLocaleString(),
											'PCT_MINORITY_2010'	: ((+attrs['minority_pop_pct_2010']*100).toFixed(1)).toLocaleString(),											
											'POP_LEP_2010'		: (+(attrs['total_lep_pop_2010'].toFixed(0))).toLocaleString(),
											'PCT_LEP_2010'		: ((+attrs['lep_pop_pct_2010']*100).toFixed(1)).toLocaleString(),
											'POP_DISABLED_2010'	: (+(attrs['total_disabled_pop_2010'].toFixed(0))).toLocaleString(),
											'PCT_DISABLED_2010'	: ((+attrs['disabled_pop_pct_2010']*100).toFixed(1)).toLocaleString(),												
											'POP_2040'			: (+(attrs['total_pop_2040'].toFixed(0))).toLocaleString(),
											'POP_PSQMI_2040'	: (+(attrs['pop_psqmi_2040'].toFixed(0))).toLocaleString(),													
											'POP_PSQMI_CHANGE'	: (+(attrs['pop_psqmi_change_2010_2040'].toFixed(0))).toLocaleString()
										};
										// Employment
										myData2[k] = {
											'TAZ'				: +attrs['taz'],
											'TOWN'				: townProper,
											'EMP_2010'			: (+(attrs['total_emp_2010'].toFixed(0))).toLocaleString(),
																	// *** NOTE: Will need to change code here if/when DB table column name changes!!!
											'EMP_PSQMI_2010'	: (+(attrs['emp_sqmi_2010'].toFixed(0))).toLocaleString(),
											'EMP_2040'			: (+(attrs['total_emp_2040'].toFixed(0))).toLocaleString(),
											'EMP_PSQMI_2040'	: (+(attrs['emp_psqmi_2040'].toFixed(0))).toLocaleString(),
											'EMP_PSQMI_CHANGE'	: (+(attrs['emp_psqmi_change_2010_2040'].toFixed(0))).toLocaleString()
										};
										// Households
										myData3[k] = {
											'TAZ'				: +attrs['taz'],
											'TOWN'				: townProper,
											'NUM_HH_2010'		: (+(attrs['census_hh_2010'].toFixed(0))).toLocaleString(),
											'HH_PSQMI_2010'		: (+(attrs['hh_psqmi_2010'].toFixed(0))).toLocaleString(),		
											'HH_LOWINC_2010'    : ((+attrs['total_lowinc_hh_2010']).toFixed(0)).toLocaleString(),
											'PCT_HH_LOWINC_2010': ((+attrs['lowinc_hh_pct_2010']*100).toFixed(1)).toLocaleString(),		
											'HH_ZV_2010'		: ((+attrs['total_zero_veh_hh_2010']).toFixed(0)).toLocaleString(),
											'PCT_HH_ZV_2010'	: ((+attrs['zero_veh_hh_pct_2010']*100).toFixed(1)).toLocaleString(),					
											'HH_PSQMI_2040'     : (+(attrs['hh_psqmi_2040'].toFixed(0))).toLocaleString(),
											'HH_PSQMI_CHANGE'	: (+(attrs['hh_psqmi_change_2010_2040'].toFixed(0))).toLocaleString()					
										};
									};
									myData.sort(SortByTaz);
									myData2.sort(SortByTaz)
									myData3.sort(SortByTaz)
									// Create accessible HTML tables from the JS data stores
									//
									// Population data.
									var colDescPop = [
										{ header : '<br>TAZ', dataIndex : 'TAZ', width: '50px', style: '' }, 
										{ header : '<br>Town', dataIndex : 'TOWN', width: '100px', style: ''}, 
										{ header : 'Total<br/>Population<br />2010', dataIndex : 'POP_PSQMI_2010', width: '80px', style: 'align="right"' },
										{ header : 'Population per<br/>Square Mile<br />2010', dataIndex : 'POP_PSQMI_2010', width: '80px', style: 'align="right"' }, 
										{ header : 'Total Population<br />Under<br/> Age 18', dataIndex : 'POP_U18_2010', width: '80px', style: 'align="right"' },
										{ header : 'Percent of Population<br />Under<br/> Age 18', dataIndex : 'PCT_UNDER_18', width: '80px', style: 'align="right"' },
										{ header : 'Total Population<br />Over<br/> Age 75', dataIndex : 'POP_75PLUS_2010', width: '80px', style: 'align="right"' },
										{ header : 'Percent of Population<br />Over<br/> Age 18', dataIndex : 'PCT_OVER_75', width: '80px', style: 'align="right"' },
										{ header : 'Total Population<br />Belonging to a<br/>Minority Group', dataIndex : 'POP_MINORITY_2010', width: '80px', style: 'align="right"' },
										{ header : 'Percent of Population<br />Belonging to a<br/>Minority Group', dataIndex : 'PCT_MINORITY_2010', width: '80px', style: 'align="right"' },
										{ header : 'Total Population<br />with Limited<br/>English Proficiency', dataIndex : 'POP_LEP_2010', width: '80px', style: 'align="right"' },
										{ header : 'Percent of Population<br />with Limited<br/>English Proficiecy', dataIndex : 'PCT_LEP_2010', width: '80px', style: 'align="right"' },
										{ header : 'Total Population<br />with a<br/>Disability', dataIndex : 'POP_DISABLED_2010', width: '80px', style: 'align="right"' },
										{ header : 'Percent of Population<br />with a<br/>Disability', dataIndex : 'PCT_DISABLED_2010', width: '80px', style: 'align="right"' },										
										{ header : 'Population per<br/>Square Mile<br />2040', dataIndex : 'POP_PSQMI_2040', width: '80px', style: 'align="right"' },
										{ header : 'Population Density<br/>Change<br/>2010-2040', dataIndex : 'POP_PSQMI_CHANGE', width: '80px', style: 'align="right"' }
									];
									popGrid = new AccessibleGrid({
										divId 		:	'pop_grid',
										tableId 	:	'pop_table',
										summary		: 	'rows are individual TAZs within selected town and columns are TAZ, town name, population per square mile for 2010 and 2040, and percent change 2010 to 2040',
										caption		:	'Population data by TAZ for <strong>' + townProper + '</strong>:<br />(Click on line in table to see TAZ highlighted on map) ',
										//ariaLive	:	'assertive',
										colDesc		: 	colDescPop
									});
									popGrid.loadArrayData(myData);									
									// Demographic data on employment.
									var colDescEmp = [
										{ header : '<br>TAZ', dataIndex : 'TAZ', width: '50px', style: '' }, 
										{ header : '<br>Town', dataIndex : 'TOWN', width: '100px', style: ''}, 
										{ header : 'Total Employment<br/>2010', dataIndex : 'EMP_2010', width: '80px', style: 'align="right"' }, 
										{ header : 'Employment<br/>per<br/>Square Mile<br/>2010', dataIndex : 'EMP_PSQMI_2010', width: '80px', style: 'align="right"' }, 
										{ header : 'Total Employment<br/>2040', dataIndex : 'EMP_2040', width: '80px', style: 'align="right"' }, 
										{ header : 'Employment<br/>per<br/>Square Mile<br/>2040', dataIndex : 'EMP_PSQMI_2040', width: '80px', style: 'align="right"' },
										{ header : 'Employement Density<br/>Change<br/>2010-2040', dataIndex : 'EMP_PSQMI_CHANGE', width: '80px', style: 'align="right"' }
									];
									empGrid = new AccessibleGrid({
										divId 		:	'emp_grid',
										tableId 	:	'emp_table',
										summary		: 	'rows are individual TAZs within selected town and columns are TAZ, town name, employment per square mile for 2010 and 2040, and percent change 2010 to 2040',
										caption		:	'Employment data by TAZ for <strong>' + townProper + '</strong>: <br />(Click on line in table to see TAZ highlighted on map) ',
										//ariaLive	:	'assertive',
										colDesc		: 	colDescEmp
									});
									empGrid.loadArrayData(myData2);  									
									// Demographic data on households.
									var colDescHH = [
										{ header : '<br>TAZ', dataIndex : 'TAZ', width: '50px', style: '' }, 
										{ header : '<br>Town', dataIndex : 'TOWN', width: '100px', style: ''}, 
										{ header : 'Number of<br/>Households<br/>2010', dataIndex : 'NUM_HH_2010', width: '80px', style: 'align="right"' }, 
										{ header : 'Households<br/>per Sq Mi<br/>2010', dataIndex : 'HH_PSQMI_2010', width: '80px', style: 'align="right"' }, 
										{ header : 'Number of<br/>Low Income<br/>Households<br/>2010', dataIndex : 'HH_LOWINC_2010', width: '80px', style: 'align="right"' },
										{ header : 'Percent of<br/>Households with<br/>Low Income 2010', dataIndex : 'PCT_HH_LOWINC_2010', width: '80px', style: 'align="right"' },
										{ header : 'Number of<br/>Zero Vehicle<br/>Households<br/>2010', dataIndex : 'HH_ZV_2010', width: '80px', style: 'align="right"' },
										{ header : 'Percent of <br/>Households<br/>with<br/>Zero Vehicles<br/>2010', dataIndex : 'PCT_HH_ZV_2010', width: '80px', style: 'align="right"' },										
										{ header : 'Households<br/>per Sq Mi<br/>2040', dataIndex : 'HH_PSQMI_2040', width: '80px', style: 'align="right"' },
										{ header : 'Household Density<br >Change<br/>2010-2040', dataIndex : 'HH_PSQMI_CHANGE', width: '80px', style: 'align="right"' },
									];
									hhGrid = new AccessibleGrid({
										divId 		:	'hh_grid',
										tableId 	:	'hh_table',
										summary		: 	'rows are individual TAZs within selected town and columns are TAZ, town name, households per square mile for 2010 and 2040, and percent change 2010 to 2040',
										caption		:	'Household data by TAZ for <strong>' + townProper + '</strong>:<br/>(Click on line in table to see TAZ highlighted on map) ',
										//ariaLive	:	'assertive',
										colDesc		: 	colDescHH
									});			
									hhGrid.loadArrayData(myData3);																
									// Allow display of data tables
									CSSClass.remove('mytabs');	
									CSSClass.add('mytabs2');
									CSSClass.add('mytabs3');
									// Identify clicked-on row in table, pass taz id to function that highlights on map.
									$(document).ready(function() {
										$('tr td').hover(function(){
											$(this).addClass('hover');
										}, function(){
											$(this).removeClass('hover');
										});
										$('tr').click(function(){
											$('tr').removeClass('wrappedElement');
											$myrow = $(this).addClass('wrappedElement');
											$myvalue = $myrow.find('td:eq(0)')
											var selectedTAZ = $myvalue.text();
											CTPS.lrtpApp.highlightMapTaz(selectedTAZ);
										}); 
									}); //  End of function to identify clicked row in table.
								},  
				failure		: 	function (qXHR, textStatus, errorThrown ) {
									alert('WFS request in "getSETable" failed.\n' +
											'Status: ' + textStatus + '\n' +
											'Error:  ' + errorThrown);
								}
		});
    });	// on-click event handler for #getSETable
	
	// Functions for retrieving and displaying tabular transportation data for a given corridor.
	//
	// Organization of this stuff:
	// 	1. Event handler to expose/hide button conrols for getting this data.
	//  2. N helper functions for submitting WFS requests, collecting responses, and populating
	//     grids of tabular data for (a) crashes, (b) VOC indices, (c) speed index
	//     (d) travel time index, and (e) commuter rail stations.
	//     These functions are called in a "cascade" which is kicked off by ...
	//  3. The on-click event handler for the <input> button control with id "getTableTR".
	//
	// -- BK 01/31/2018
	
	// The following function was formerly called CTPS.lrtpApp.identifyTRCorridor.
	// It is simply the on-change event handler for the <select> control with id "table_subregion"
	$('#table_subregion').change(function(e) {
		// Function unhides and hides relevant buttons when new corridor selected
		if($('#getTableTR').attr('class')==='hidden2') {
			unhideLine('getTableTR');
		};
		if($('#downloadTRData').attr('class')==='unhidden2') {
			unhideLine('downloadTRData');
		};
		if($('#clearTRTable').attr('class')==='unhidden2') {
			unhideLine('clearTRTable');
		};	
	});
	
	// Beginning of "helper" functions for on-clck event handler for #getTableTR button.
	// 
	// Helper function (a) displayCrashes.
	//
	var displayCrashes = function(cql_Filter, tabsub_txt) { 
		var items_TR = "crashcount,epdo,l1street,l2street,towns,plan2035_radial_corr,circumferential_corridor";
		var szUrl = CTPS.lrtpApp.szWFSserverRoot + '?';
		
		CSSClass.add('mytabs');
		CSSClass.add('mytabs3');
		CSSClass.remove('mytabs2');
		clearAllGrids();
		$('#crash_grid').html('');

		szUrl += '&service=wfs&version=1.0.0&request=getfeature';
		szUrl += '&typename=' + PLAN.gs_layers.crash_layer_poly;
		szUrl += '&outputformat=json';
		szUrl += '&cql_filter=' + cql_Filter;
		szUrl += '&propertyname=' + items_TR;
		$.ajax({ url		: szUrl,
				 type		: 'GET',
				 dataType	: 'json',
				 success	: 	function (data, textStatus, jqXHR) {
									var reader = new ol.format.GeoJSON();
									var aFeatures = reader.readFeatures(jqXHR.responseText);
									if (aFeatures.length === 0) {
										alert('No features found--try another');
										return;
									};
									// Load, Populate Table Data Stores
									var k, attrs, myData = [], crashGrid = {};
									for (k = 0; k < aFeatures.length; k++) {
										attrs = aFeatures[k].getProperties();
										myData[k] = {
											'EPDO'				: +attrs['epdo'],
											'TOWN'				: attrs['towns'],
											'STREET1'			: attrs['l1street'],
											'STREET2'			: attrs['l2street'],
											'TOTAL_CRASHES'		: (+attrs['crashcount']).toLocaleString()
										};
									};
									// Sort JSON Array
									myData.sort(SortByEPDO);
									// Create Accessible Grids from Table Data Stores
									var colDescCrash = [                          
										{ header : 'EPDO <br>Value', dataIndex : 'EPDO' , width: '50px', style: ''}, 
										{ header : '<br>Town', dataIndex : 'TOWN', width: '50px', style: '' }, 
										{ header : '<br>Street 1', dataIndex : 'STREET1', width: '180px', style: '' },
										{ header : '<br>Street 2', dataIndex : 'STREET2', width: '180px', style: '' },
										{ header : 'Total Crashes', dataIndex : 'TOTAL_CRASHES', width: '50px', style: 'align="right"' }
									];
									crashGrid = new AccessibleGrid({
										divId 		:	'crash_grid',
										tableId 	:	'crash_table',
										summary		: 	'rows are individual crash locations and columns are E P D O value, town, intersecting streets 1 and 2 and total number of crashes',
										caption		:	'Top 5 Percent Crashes for: ' + tabsub_txt + ' Region, <br /> Ranked by EPDO Value ' ,
										//ariaLive	:	'assertive',
										colDesc		: 	colDescCrash
									});			
									crashGrid.loadArrayData(myData); 
									// Cascading call to get VOC data.
									displayVOCIndex(cql_Filter, tabsub_txt); 
								},  
				failure		: 	function (qXHR, textStatus, errorThrown ) {
									alert('WFS request  to get crash data failed.\n' +
											'Status: ' + textStatus + '\n' +
											'Error:  ' + errorThrown);
								}
		}); 
	}; // displayCrashes()
	
	// Helper function (b) displayVOCIndex()
	//	
	var displayVOCIndex = function(cql_Filter, tabsub_txt) {
		var items_TR = "data_key,plan2035_radial_corr,roadway_type,peak_period,roadway,voc";
		var szUrl = CTPS.lrtpApp.szWFSserverRoot + '?';		
		$('#VOC_grid').html('');
		
		szUrl += '&service=wfs&version=1.0.0&request=getfeature';
		szUrl += '&typename=' + PLAN.gs_layers.VOC_table;
		szUrl += '&outputformat=json';
		szUrl += '&cql_filter=' + cql_Filter;
		szUrl += '&propertyname=' + items_TR;
		$.ajax({ url		: szUrl,
				 type		: 'GET',
				 dataType	: 'json',
				 success	: 	function (data, textStatus, jqXHR) {
									var reader = new ol.format.GeoJSON();
									var aFeatures = reader.readFeatures(jqXHR.responseText);
									if (aFeatures.length === 0) {
										alert('No features found--try another');
										return;
									};
									// Load, Populate Table Data Stores
									var k, attrs,  myData = [], VOC_grid = {};
									for (k = 0; k < aFeatures.length; k++) {
										attrs = aFeatures[k].getProperties();
										myData[k] = {
											'INDEX'                 : +attrs['data_key'], 
											'YEAR'                  : attrs['year'],
											'CORRIDOR'              : attrs['plan2035_radial_corr'], 
											'ROAD_TYPE'             : attrs['roadway_type'],       
											'PEAK_PERIOD'           : attrs['peak_period'], 
											'ROADWAY'               : attrs['roadway'], 
											'VOC'                   : attrs['voc']
										};
									};
									// Sort JSON Array
									myData.sort(SortByIndex);
									// Create Accessible Grids from Table Data Stores
									var colDescVOC = [
										{ header : 	'Roadway', dataIndex : 'ROADWAY', width: '400px', style: '' },
										{ header : 	'Road Type', dataIndex : 'ROAD_TYPE', width: '100px', style: '' },
										{ header : 	'Peak Period', dataIndex : 'PEAK_PERIOD' , width: '70px', style: ''},
										{ header : 	'Volume/Capacity<br/>Ratio', dataIndex : 'VOC', width: '220px', style: '' }
									];
									VOC_grid = new AccessibleGrid( { divId 		:	'VOC_grid',
										tableId 	:	'VOC_table',
										summary		: 	'rows are commuter rail stations within selected region and columns are station name and commuter rail line',
										caption		:	'Highest Current Volume-Capacity Ratios for: ' + tabsub_txt + ' Region',
										// ariaLive	:	'assertive',
										colDesc		: 	colDescVOC
									});
									VOC_grid.loadArrayData(myData);
									// Cascading call to get speed index data.
									displaySpeedIndex(cql_Filter, tabsub_txt);
								},  
				failure		: 	function (qXHR, textStatus, errorThrown ) {
									alert('WFS request to get VOC data failed.\n' +
											'Status: ' + textStatus + '\n' +
											'Error:  ' + errorThrown);
								}
		}); 
	}; // displayVOCIndex()	
	
	// Helper function (c) displaySpeedIndex()
	//	
	var displaySpeedIndex = function(cql_Filter, tabsub_txt) {
		var items_TR = "year,plan2035_radial_corr,circumferential_corridor,peakperiod,route,direction,from_to,speedindex";  
		var szUrl = CTPS.lrtpApp.szWFSserverRoot + '?';
		$('#spd_idx_grid').html('');
		
		szUrl += '&service=wfs&version=1.0.0&request=getfeature';
		szUrl += '&typename=' + PLAN.gs_layers.spd_idx_table;
		szUrl += '&outputformat=json';
		szUrl += '&cql_filter=' + cql_Filter;
		szUrl += '&propertyname=' + items_TR;
		$.ajax({ url		: szUrl,
				 type		: 'GET',
				 dataType	: 'json',
				 success	: 	function (data, textStatus, jqXHR) {
									var reader = new ol.format.GeoJSON();
									var aFeatures = reader.readFeatures(jqXHR.responseText);
									if (aFeatures.length === 0) {
										alert('No features found--try another');
										return;
									};
									// Load, Populate Table Data Stores
									var k, attrs, myData = [], spd_idx_grid = {};
									for (k = 0; k < aFeatures.length; k++) {
										attrs = aFeatures[k].getProperties();
										myData[k] = {
											'YEAR'				: attrs['year'], 
											'PEAKPERIOD'		: attrs['peakperiod'],
											'ROUTE'				: attrs['route'], 
											'DIRECTION'			: attrs['direction'],       
											'FROM_TO'			: attrs['from_to'], 
											'SPEEDINDEX'		: attrs['speedindex'], 
											'RADIAL_CORRIDOR'	: attrs['plan2035_radial_corr']
										};
									};
									// Sort JSON Array by peak period.
									myData.sort(SortByPeriod);
									// Create Accessible Grids from Table Data Stores
									var colDescSpdIdx = [
										{ header : 	'Route', dataIndex : 'ROUTE', width: '120px', style: '' },
										{ header : 	'From/To', dataIndex : 'FROM_TO', width: '500px', style: '' },
										{ header : 	'Peak Period', dataIndex : 'PEAKPERIOD' , width: '90px', style: ''},
										{ header : 	'Direction', dataIndex : 'DIRECTION', width: '120px', style: '' },
										{ header : 	'Speed Index', dataIndex : 'SPEEDINDEX', width: '180px', style: '' }
									];
									spd_idx_grid = new AccessibleGrid({
										divId 		:	'spd_idx_grid',
										tableId 	:	'spd_idx_table',
										summary		: 	'rows are commuter rail stations within selected region and columns are station name and commuter rail line',
										caption		:	'Highest Speed Index Values for: ' + tabsub_txt + ' Region' ,
										//ariaLive	:	'assertive',
										colDesc		: 	colDescSpdIdx
									});			
									spd_idx_grid.loadArrayData(myData);
									// Cascading call to get travel time index data.
									displayTTIndex(cql_Filter, tabsub_txt);
								},  
				failure		: 	function (qXHR, textStatus, errorThrown ) {
									alert('WFS request to get speed index data failed.\n' +
											'Status: ' + textStatus + '\n' +
											'Error:  ' + errorThrown);
								}
		}); 
	}; // displaySpeedIndex()

	// Helper function (d) displayTTIndex()
	//
	var displayTTIndex = function(cql_Filter, tabsub_txt) {
		var items_TR = "year,plan2035_radial_corr,circumferential_corridor,peakperiod,route,direction,from_to,traveltimeindex";  
		var szUrl = CTPS.lrtpApp.szWFSserverRoot + '?';		
		$('#tt_grid').html('');

		szUrl += '&service=wfs&version=1.0.0&request=getfeature';
		szUrl += '&typename=' + PLAN.gs_layers.tt_table;
		szUrl += '&outputformat=json';
		szUrl += '&cql_filter=' + cql_Filter;
		szUrl += '&propertyname=' + items_TR;
		$.ajax({ url		: szUrl,
				 type		: 'GET',
				 dataType	: 'json',
				 success	: 	function (data, textStatus, jqXHR) {
									var reader = new ol.format.GeoJSON();
									var aFeatures = reader.readFeatures(jqXHR.responseText);
									if (aFeatures.length === 0) {
										alert('No features found--try another');
										return;
									};
									// Load, Populate Table Data Stores
									var k, attrs, myData = [], tt_grid = {};
									for (k = 0; k < aFeatures.length; k++) {
										attrs = aFeatures[k].getProperties();
										myData[k] = { 
											'YEAR'                 : attrs['year'], 
											'PEAKPERIOD'           : attrs['peakperiod'],
											'ROUTE'                : attrs['route'], 
											'DIRECTION'            : attrs['direction'],       
											'FROM_TO'              : attrs['from_to'], 
											'TRAVELTIMEINDEX'      : attrs['traveltimeindex'], 
											'RADIAL_CORRIDOR'      : attrs['plan2035_radial_corr']
										};                                        
									};
									// Sort JSON Array by peak period
									myData.sort(SortByPeriod);
									// Create Accessible Grids from Table Data Stores
									var colDescTTIdx = [                                                           
										{ header : 	'Route', 	              dataIndex : 'ROUTE', width: '120px', style: '' },
										{ header : 	'From/To', 	              dataIndex : 'FROM_TO', width: '500px', style: '' },
										{ header : 	'Peak Period', 			  dataIndex : 'PEAKPERIOD' , width: '90px', style: ''},                                    
										{ header : 	'Direction', 	          dataIndex : 'DIRECTION', width: '120px', style: '' },
										{ header : 	'Travel Time Index', 	  dataIndex : 'TRAVELTIMEINDEX', width: '180px', style: '' }
									];
									tt_grid = new AccessibleGrid({
										divId 		:	'tt_grid',
										tableId 	:	'tt_table',
										summary		: 	'rows are commuter rail stations within selected region and columns are station name and commuter rail line',
										caption		:	'Highest Travel Time Index Values for: ' + tabsub_txt + ' Region',
										//ariaLive	:	'assertive',
										colDesc		: 	colDescTTIdx
									});			
									tt_grid.loadArrayData(myData);
									// Cascading call to get commuter rail stations.
									displayCRStations(cql_Filter, tabsub_txt);
								},  
				failure		: 	function (qXHR, textStatus, errorThrown ) {
									alert('WFS request to get travel time index data failed.\n' +
											'Status: ' + textStatus + '\n' +
											'Error:  ' + errorThrown);
								}
		});
	}; // displayTTIndex()

	// Helper function (e) displayCRStations()
	//
	var displayCRStations = function(cql_Filter, tabsub_txt) { 
		var items_TR = "station,line_brnch,plan2035_radial_corr";  
		var szUrl = CTPS.lrtpApp.szWFSserverRoot + '?';		
		$('#CRStn_grid').html('');	

		szUrl += '&service=wfs&version=1.0.0&request=getfeature';
		szUrl += '&typename=' +PLAN.gs_layers.CR_stns;
		szUrl += '&outputformat=json';
		szUrl += '&cql_filter=' + cql_Filter;
		szUrl += '&propertyname=' + items_TR;
		$.ajax({ url		: szUrl,
				 type		: 'GET',
				 dataType	: 'json',
				 success	: 	function (data, textStatus, jqXHR) {
									var reader = new ol.format.GeoJSON();
									var aFeatures = reader.readFeatures(jqXHR.responseText);
									if (aFeatures.length === 0) {
										alert('No features found--try another');
										return;
									};
									// Load, Populate Table Data Stores
									var k, attrs, myData = [], CRStnGrid = {};
									for (k = 0; k < aFeatures.length; k++) {
										attrs = aFeatures[k].getProperties();
										myData[k] = {
											'STATION'			: attrs['station'],
											'LINE_BRNCH'		: attrs['line_brnch'],                                                                   
											'RADIAL_CORRIDOR'	: attrs['radial_corridor']
										};
									};
									//  Sort JSON Array by station
									myData.sort(SortByStn);
									// Create Accessible Grids from Table Data Stores
									var colDescCRStn = [                            
										{ header : 'Station', dataIndex : 'STATION' , width: '200px', style: ''},                                    
										{ header : 'Line', dataIndex : 'LINE_BRNCH', width: '270px', style: '' }                                   
									];
									CRStnGrid = new AccessibleGrid({
										divId 		:	'CRStn_grid',
										tableId 	:	'CRStn_table',
										summary		: 	'rows are commuter rail stations within selected region and columns are station name and commuter rail line',
										caption		:	'Commuter Rail stations in : ' + tabsub_txt + ' Region',
										//ariaLive	:	'assertive',
										colDesc		: 	colDescCRStn
									});
									CRStnGrid.loadArrayData(myData);
								},  
				failure		: 	function (qXHR, textStatus, errorThrown ) {
									alert('WFS request to get commuter rail station data failed.\n' +
											'Status: ' + textStatus + '\n' +
											'Error:  ' + errorThrown);
								}
		});
	}; // displayCRStations()
	//
	// End of "helper" functions for retrieving tabular transportation data for a given corridor.
	
	// The following function was formerly called displayTRCorridorData.
	// It is the on-click event handler for the input <button> control with id "getTableTR"
	// It kicks of a cascade of calls to the above "helper" functions to retrieve and display
	// tabular transportation data for the selected corridor.
	// 
	// Legacy comments from Mary:
    // 		Initializes grids & tabs, hides & unhides relevant buttons, identifies which corridor's data will be displayed, 
    //		and creates cql_Filter with selected corridor to use in OpenLayers query 
	
	$('#getTableTR').click(function(e) {
		CSSClass.add('mytabs');
		CSSClass.remove('mytabs2');
		CSSClass.add('mytabs3');
		
		if($('#downloadTRData').attr('class')==='hidden2'){
			unhideLine('downloadTRData');
		}
		if($('#clearTRTable').attr('class')==='hidden2'){
			unhideLine('clearTRTable');
		}
		clearAllGrids();
		 
		var my_subregion = '';
		my_subregion = document.getElementById('table_subregion').value;
		var i;
		for (i = 0; i < table_subregion.options.length; i++){
			if (table_subregion.options[i].selected==true){
				var tabsub_txt = table_subregion.options[i].innerHTML;
				break;
			};
		}
		CTPS.lrtpApp.chosen_subregion = my_subregion;
		var cql_Filter = CTPS.lrtpApp.chosen_subregion;
		if (CTPS.lrtpApp.chosen_subregion==='Core') {
			cql_Filter = "(circumferential_corridor in ('BOS','CEN'))";
		} else {
			// N.B. Use ofttribute name in the following query is deliberate.
			//      K. Jacob named this attribute ... dealing with this is one battle I'm not prepared to fight at the moment.
			// -- BK 06/13/2018
			cql_Filter = "(plan2035_radial_corr='" + CTPS.lrtpApp.chosen_subregion + "')";
		}
		
		// Call to get crash data. 
		// Called function will begin "cascade" of calls to get other tabular transportation data for the corridor.
		displayCrashes(cql_Filter, tabsub_txt);
	}); // on-click event handler for #getTableTR button.
	
	
	// Functions to support retrieval and display of region-wide tabular transportation data.
	//
	// Organization of this stuff:
	//  1. Three helper functions for submitting WFS requests, collecting responses, and populating
	//     grids of tabular data for (a) boat docks, (b) park-and-ride lots,
	//     and (c) off-road bike paths.
	//     These functions are called in a "cascade" which is kicked off by ...
	//  2. The on-click event handler for the <input> button control with id "fetchRegionwideTable,"
	//     which itself handles fetching and display of airports data.
	//
	// -- BK 01/31/2018
	
	// Helper function (a) displayPRlots
	//
	var displayPRlots = function() {
		// N.B. Change in attribute name from 'bus_service' to 'bus_servic'
		//      in new version of MDOT data layer. 
		//      Attr names were truncated to fit limitations of shapefile format.
		//      Yeech.
		var items_regionwide = "town,location,capacity,bus_servic";
		$('#PRlots_grid').html('');

		var szUrl = CTPS.lrtpApp.szWFSserverRoot + '?';
		szUrl += '&service=wfs&version=1.0.0&request=getfeature';
		szUrl += '&typename=' + PLAN.gs_layers.park_ride_lots;
		szUrl += '&outputformat=json';
		szUrl += '&propertyname=' + items_regionwide;
		$.ajax({ url		: szUrl,
				 type		: 'GET',
				 dataType	: 'json',
				 success	: 	function (data, textStatus, jqXHR) {
									var reader = new ol.format.GeoJSON();
									var aFeatures = reader.readFeatures(jqXHR.responseText);
									if (aFeatures.length === 0) {
										alert('No features found--try another');
										return;
									};
									// Load, Populate Table Data Stores
									var k, attrs, myData = [], PRlotsGrid = {};
									for (k = 0; k < aFeatures.length; k++) {
										attrs = aFeatures[k].getProperties();
										myData[k] = {
											'TOWN'			: attrs['town'],
											'LOCATION'		: attrs['location'],
											'CAPACITY'		: attrs['capacity'],
											'BUS_SERVICE'	: attrs['bus_servic']
										};
									};
									//  Sort JSON Array by Town
									myData.sort(SortByTown);
									// Create Accessible Grids from Table Data Stores
									var colDescPRlots = [                                                        
										{ header : 'Town', dataIndex : 'TOWN', width: '120px', style: '' }, 
										{ header : 'Location', dataIndex : 'LOCATION', width: '400px', style: '' },
										{ header : 'Capacity', dataIndex : 'CAPACITY', width: '120px', style: '' }, 
										{ header : 'Bus Service', dataIndex : 'BUS_SERVICE', width: '300px', style: '' }
									];
									PRlotsGrid = new AccessibleGrid({
										divId 		:	'PRlots_grid',
										tableId 	:	'PRlots_table',
										summary		: 	'rows are individual park ride lots, columns are town, street location, parking capacity and available bus services',
										caption		:	'MassDOT park-ride lots in the Boston Region', 
										//             ariaLive	:	'assertive',
										colDesc		: 	colDescPRlots                                                    
									});
									PRlotsGrid.loadArrayData(myData); 
									// Cascading call to get boat dock data.
									displayBoatDocks();
								},  
				failure		: 	function (qXHR, textStatus, errorThrown ) {
									alert('WFS request to get park and ride lot data failed.\n' +
											'Status: ' + textStatus + '\n' +
											'Error:  ' + errorThrown);
								}
		});
	}; // displayPRlots()
	
	// Helper function (b) displayBoatDocks
	//	
	var displayBoatDocks = function() {
		var items_regionwide = "term_name,passenger,town,service,mpo";
		var szUrl = CTPS.lrtpApp.szWFSserverRoot + '?';		
		$('#boatdocks_grid').html('');

		szUrl += '&service=wfs&version=1.0.0&request=getfeature';
		szUrl += '&typename=' + PLAN.gs_layers.seaports;
		szUrl += '&outputformat=json';
		szUrl += '&propertyname=' + items_regionwide;
		$.ajax({ url		: szUrl,
				 type		: 'GET',
				 dataType	: 'json',
				 success	: 	function (data, textStatus, jqXHR) {
									var reader = new ol.format.GeoJSON();
									var aFeatures = reader.readFeatures(jqXHR.responseText);
									if (aFeatures.length === 0) {
										alert('No features found--try another');
										return;
									};
									// Load, Populate Table Data Stores
									var new_index = 0;
									var k, attrs, myData = [], docksGrid = {};
									for (k = 0; k < aFeatures.length; k++) {
										attrs = aFeatures[k].getProperties();
										if (attrs['mpo']==='Boston Region' && attrs['passenger']==='Yes') {
											myData[new_index] = {
												'TERM_NAME'		: attrs['term_name'],
												'TOWN'			: attrs['town'],
												'SERVICE'		: attrs['service']
											};
											new_index++;
										};
									};
									//  Sort JSON Array by Town
									myData.sort(SortByTown);
									// Create Accessible Grids from Table Data Stores
									var colDescDocks = [                          
										{ header : 'Terminal', dataIndex : 'TERM_NAME', width: '300px', style: '' },
										{ header : 'Town', dataIndex : 'TOWN', width: '120px', style: '' },                                    
										{ header : 'Service', dataIndex : 'SERVICE', width: '120px', style: '' }
									];
									docksGrid = new AccessibleGrid({
										divId 		:	'boatdocks_grid',
										tableId 	:	'boatdocks_table',
										summary		: 	'rows are individual docks, columns are dock name, town where located, and whether service is seasonal or year round',
										caption		:	'Passenger boat/ferry docks in the Boston Region', 
										//ariaLive	:	'assertive',
										colDesc		: 	colDescDocks                                                    
									});			
									docksGrid.loadArrayData(myData); 
									// Cascading call to get bike path data.
									displayBikePaths();
								},  
				failure		: 	function (qXHR, textStatus, errorThrown ) {
									alert('WFS request to get boat dock data failed.\n' +
											'Status: ' + textStatus + '\n' +
											'Error:  ' + errorThrown);
								}
		});
	}; // displayBoatDocks()

	// Helper function (c) displayBikePaths
	//	
	var displayBikePaths = function() {
		var items_regionwide = "local_name,sum_len_miles";
		var szUrl = CTPS.lrtpApp.szWFSserverRoot + '?';		
		$('#bikes_grid').html('');
		
		szUrl += '&service=wfs&version=1.0.0&request=getfeature';
		szUrl += '&typename=' + PLAN.gs_layers.bikes_table;
		szUrl += '&outputformat=json';
		szUrl += '&propertyname=' + items_regionwide;
		$.ajax({ url		: szUrl,
				 type		: 'GET',
				 dataType	: 'json',
				 success	: 	function (data, textStatus, jqXHR) {
									var reader = new ol.format.GeoJSON();
									var aFeatures = reader.readFeatures(jqXHR.responseText);
									if (aFeatures.length === 0) {
										alert('No features found--try another');
										return;
									};
									// Load, Populate Table Data Stores
									var k, attrs, myData = [], bikesGrid = {};
									for (k = 0; k < aFeatures.length; k++) {
										attrs = aFeatures[k].getProperties();
										myData[k] = {                                                          
											'LOCALNAME'		: attrs['local_name'],                                                           
											'LENGTH'		: +(attrs['sum_len_miles']).toFixed(2)                                                                                                            
										};
									};
									//  Sort JSON Array by Town
									myData.sort(SortByName);
									// Create Accessible Grids from Table Data Stores
									var colDescBikes = [                                                        
										{ header : 'Local name', dataIndex : 'LOCALNAME', width: '340px', style: '' },                                    
										{ header : 'Aproximate Length<br/>(miles)', dataIndex : 'LENGTH', width: '120px', style: '' }
									];
									bikesGrid = new AccessibleGrid({ 
										divId 		:	'bikes_grid',
										tableId 	:	'bikes_table',
										summary		: 	'rows are individual park ride lots, columns are town, street location, parking capacity and available bus services',
										caption		:	'Dedicated bike paths in the Boston Region', 
										//               ariaLive	:	'assertive',
										colDesc		: 	colDescBikes                                                    
									});
									bikesGrid.loadArrayData(myData); 
								},  
				failure		: 	function (qXHR, textStatus, errorThrown ) {
									alert('WFS request to get bike facility data failed.\n' +
											'Status: ' + textStatus + '\n' +
											'Error:  ' + errorThrown);
								}
		}); 
	}; //  displayBikePaths
	// 
	// End of "helper" functions for retrieving region-wide tabular transportation data.

	// On-click event handler for the <input> button with id "fetchRegionwideTable" (sic).
	//
	$("#fetchRegionwideTable").click(function(){
		// Airports
		var items_regionwide = "town,airport_name";
		var szUrl = CTPS.lrtpApp.szWFSserverRoot + '?';		
				
		CSSClass.add('mytabs');
		CSSClass.add('mytabs2');
		CSSClass.remove('mytabs3');
		$('#downloadTRRegionwideData,#clearTRRegionTable').show();
		clearAllGrids();
		$('#airport_grid').html('');

		szUrl += '&service=wfs&version=1.0.0&request=getfeature';
		szUrl += '&typename=' + PLAN.gs_layers.airports;
		szUrl += '&outputformat=json';
		szUrl += '&propertyname=' + items_regionwide;
		$.ajax({ url		: szUrl,
				 type		: 'GET',
				 dataType	: 'json',
				 success	: 	function (data, textStatus, jqXHR) {
									var reader = new ol.format.GeoJSON();
									var aFeatures = reader.readFeatures(jqXHR.responseText);
									if (aFeatures.length === 0) {
										alert('No features found--try another');
										return;
									};
									// Load, Populate Table Data Stores
									var k, attrs, myData = [], airportGrid = {};
									for (k = 0; k < aFeatures.length; k++) {
										attrs = aFeatures[k].getProperties();
										myData[k] = {
											'TOWN'			: attrs['town'],
											'AIRPORT_NAME'	: attrs['airport_name']
										};
									};
									//  Sort JSON Array by Town
									myData.sort(SortByTown);
									// Create Accessible Grids from Table Data Stores
									var colDescAirport = [                                                       
										{ header : 'Town', dataIndex : 'TOWN', width: '120px', style: '' }, 
										{ header : 'Airport Name', dataIndex : 'AIRPORT_NAME', width: '300px', style: '' }
									];
									airportGrid = new AccessibleGrid({
										divId 		:	'airport_grid',
										tableId 	:	'airport_table',
										summary		: 	'rows are individual airports with name of town where located',
										caption		:	'Airports in the Boston Region', 
										//ariaLive	:	'assertive',
										colDesc		: 	colDescAirport
									});			
									airportGrid.loadArrayData(myData);  
									// Allow display of data tables
									CSSClass.add('mytabs');
									CSSClass.add('mytabs2');
									CSSClass.remove('mytabs3');
									// Cascading call to get and display PNR lots function
									displayPRlots();
								},  
				failure		: 	function (qXHR, textStatus, errorThrown ) {
									alert('WFS request to get airport data failed.\n' +
											'Status: ' + textStatus + '\n' +
											'Error:  ' + errorThrown);
								}
		});
	}); //  end of on-click event handler to retrieve regionwide airport data

	// On-click event handers for "Download Data" buttons.
	//
    $('#downloadSEData,#downloadTRData,#downloadTRRegionwideData').click(function(e){
		// The following legacy code is, effectively an Assert.
		// I'm leaving it in here for the time being, just in case it might every be triggered.
		// One never knows ... 
		// BK 03/07/2018
		if ($('#pop_grid').html()==='' && $('#crash_grid').html()==='' && $('#airport_grid')==='') {
			alert("Assert: Attempt to download tabular data with no tabular data currently being displayed.");
			downloadWindow.hide();
			return;
		};
		  
		var table_choice = '', cql_Filter = '', szQry = '',downloadText = '';
		var my_corridor, town, piece_dom, oElement, typename, propertyname, szTemp;
	 
		// The following 3-way "if" statement determines which kind of tabular data is currently 
		// being displayed - demographic, corridor-specific transportation, or region-wide transportation.
		// It checks for non-empty contents of the first tab in each class of data to do this.
		// There must be a more elegant/robust way to do this, but for now ...
		// -- BK 03/072018
		if ($('#pop_grid').html()!=='') {
			// Demographic data - displayed in "mytabs" tabs div.
			town = ($('#selected_town').val()).toUpperCase();
			cql_Filter = "(town==" + "'" + town + "'" + ")";
			piece_dom = $('#mytabs ul > li.current').text();                
			oElement = $("#downloadAnchorTag1");	 
		} else if ($('#crash_grid').html() !== '') {
			// Corridor-specific transporatation data displayed in "mytabs2" div. 
			my_corridor = $('#table_subregion').val(); 
			if (my_corridor==='Core') {
				cql_Filter = "(circumferential_corridor in ('BOS','CEN'))";
			} else {
				cql_Filter = "(plan2035_radial_corr='" + my_corridor + "')";
			}
			piece_dom = $('#mytabs2 ul > li.current').text();
			oElement = $("#downloadAnchorTag2");
		} else if ($('#airport_grid').html()!=='') {
		   // Region-wide transportation data displayed in "mytabs3" div.
			piece_dom = $('#mytabs3 ul > li.current').text();
			var cql_FilterBoats = "(passenger='Yes')AND(mpo='Boston Region')";
			oElement = $("#downloadAnchorTag3");
		} else {
			// Assert FALSE. Something is rotten in the state of Denmark.
			return;
		}
		
		// The variable "piece_dom" contains a string (produced by the AccessibleTabs package) of the form:
		//     "Current Tab: "<text_of_tab>
		// The <text_of_tab> identifies which tab is the currently selected tab, and thus which table is to
		// be downloaded. Stripping off "Current Tab: " accomplishes this.
		table_choice = piece_dom.replace('Current Tab: ','');
		if (table_choice == 'Boat Docks') {
			// C'est un petite hacque, Pierre.
			cql_Filter = cql_FilterBoats;
		}
		typename = PLAN.download_info[table_choice].typename;
		propertyname = PLAN.download_info[table_choice].propertyname;
		szQry = "request=getfeature&version=1.0.0&service=wfs&";
		szQry += "typename=" + typename + "&";
		szQry += "outputFormat=csv&";
		if (cql_Filter!==''){
			szQry += "CQL_filter=" + cql_Filter + "&";
		} else {
			szQry = szQry;
		};    
		szQry += "propertyName=" + propertyname; 
	   
		// Construct the URL for the download.    
		szTemp = CTPS.lrtpApp.szWFSserverRoot + '?';
		szTemp += szQry;
		downloadText = szTemp;
		$('.spanForButtonWithLink').each(function() { 
			$(this).click(function() {
				location = $(this).find('a').attr('href');
			});	
		}); // end each() 	  
		oElement.attr("href", downloadText);
    }); 	
	
}); // End of $(document).ready event handler.

///////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// Initialization function for OpenLayers map.
// 
///////////////////////////////////////////////////////////////////////////////////////////////////////////
CTPS.lrtpApp.init = function(){
	//  The following WFS request populates the bus route name drop-down box under 'transportation data.'
	var szUrl = CTPS.lrtpApp.szWFSserverRoot + '?';
	szUrl += '&service=wfs&version=1.0.0&request=getfeature';     
	szUrl += '&typename=' + PLAN.gs_layers.bus_routes; // was: route_names 
	szUrl += '&outputformat=json';
	szUrl += '&propertyname=route_name,ctps_route_text';
	szUrl += '&cql_filter=direction=0';	 // Ensures query returns ONE record per route, i.e., "outpbound" of {"outbound","inbound"} pairs. 
	$.ajax({ url		: szUrl,
			 type		: 'GET',
			 dataType	: 'json',
			 success	: 	function (data, textStatus, jqXHR) {	
								var reader = new ol.format.GeoJSON();
								var aFeatures = reader.readFeatures(jqXHR.responseText);
								var aTemp = [], i, oTemp = {}, attrs = [], oOption = {};
								for (i = 0; i < aFeatures.length; i++) {
									attrs = aFeatures[i].getProperties();
									oTemp = {};                                                            
									oTemp.route = +(attrs['ctps_route_text']);                    
									oTemp.description = attrs['route_name'];
									aTemp.push(oTemp);								
								};                                                
								aTemp.sort(function(x,y) {
												return ((x.route == y.route) ? 0 : ((x.route > y.route) ? 1 : -1 ));
										   });
								// Populate the pull down list
								for (i = 0; i < aTemp.length; i++) {
									oOption = document.createElement("OPTION");	
									var combined = aTemp[i].route + ', ' + aTemp[i].description;						
									oOption.text = combined;      
									document.drop_list.route_name.options.add(oOption);  
								};	
							},  
			failure		: 	function (qXHR, textStatus, errorThrown ) {
								alert('WFS request to populated bus route list failed.\n' +
										'Status: ' + textStatus + '\n' +
										'Error:  ' + errorThrown);
							}
	});	

	// Define WMS layers in OpenLayers map
	CTPS.lrtpApp.oBaseLayers = new ol.layer.Tile({
		// title	: 'Towns',							// *** No 'title' property ==> layer will not appear in layer switcher.
		source	: new ol.source.TileWMS({
			url		:  CTPS.lrtpApp.szWMSserverRoot,
			params	: {	'LAYERS'		: 	PLAN.gs_layers.towns_survey_layer,
						'STYLES'		: 	'Plan2040_town_names_boundaries',
						'TILED'			: 	true
					  } 
			}),
			visible	: true
	});
	CTPS.lrtpApp.oTAZ = new ol.layer.Tile({	
		// title	: 'TAZs',							// *** No 'title' property ==> layer will not appear in layer switcher.
		source	: new ol.source.TileWMS({
			url		:  CTPS.lrtpApp.szWMSserverRoot,
			params	: {	'LAYERS'		: 	PLAN.gs_layers.taz2727,
						'TILED'			: 	true,
						'TRANSPARENT'	: 	true
			}
		}),
		visible	: false
	});
	CTPS.lrtpApp.oTAZ_donut = new ol.layer.Tile({	
		// title	: 'Areas not served by transit',	// *** No 'title' property ==> layer will not appear in layer switcher.
		source	: new ol.source.TileWMS({
			url		:  CTPS.lrtpApp.szWMSserverRoot,
			params	: {	'LAYERS'		: 	PLAN.gs_layers.taz2727_donut,
						'TILED'			: 	true,
						'TRANSPARENT'	: 	true
			}
		}),
		visible	: false
	});
	CTPS.lrtpApp.oTAZ_trucks = new ol.layer.Tile({	
		// title	: 'Truck Trips',				// *** No 'title' property ==> layer will not appear in layer switcher.
		source	: new ol.source.TileWMS({
			url		:  CTPS.lrtpApp.szWMSserverRoot,
			params	: {	'LAYERS'		: 	PLAN.gs_layers.taz2727_trucks,
						'TILED'			: 	true,
						'TRANSPARENT'	: 	true
			}
		}),
		visible	: false
	});
	CTPS.lrtpApp.oTruckGen = new ol.layer.Tile({	
		title	: 'Truck Trip Generators',
		source	: new ol.source.TileWMS({
			url		:  CTPS.lrtpApp.szWMSserverRoot,
			params	: {	'LAYERS'		: 	PLAN.gs_layers.truck_gen,
						'STYLES'		:	'Plan2035_truckgen_2030',  
						'TILED'			: 	true,'TRANSPARENT'	: 	true
			}
		}),
		visible	: false
	});
	CTPS.lrtpApp.oRailFreight = new ol.layer.Tile({	
		title	: 'Rail frieght',
		source	: new ol.source.TileWMS({
			url		:  CTPS.lrtpApp.szWMSserverRoot,
			params	: {	'LAYERS'		: 	PLAN.gs_layers.rail_freight,
						'TILED'			: 	true,
						'TRANSPARENT'	: 	true, 'STYLES' : 'Dest2040_rail_freight'
			}
		}),
		visible	: false
	});
	CTPS.lrtpApp.oRT = new ol.layer.Tile({	
		title	: 'MBTA Rapid Transit',
		source	: new ol.source.TileWMS({
			url		:  CTPS.lrtpApp.szWMSserverRoot,
			params	: {	'LAYERS'		: 	PLAN.gs_layers.rapid_transit,
						'TILED'			: 	true,
						'TRANSPARENT'	: 	true, 'STYLES' : 'Dest2040_mbta_rapid_transit'
			}
		}),
		visible	: false
	});
	CTPS.lrtpApp.oCR = new ol.layer.Tile({	
		title	: 'MBTA Commuter Rail',
		source	: new ol.source.TileWMS({
			url		:  CTPS.lrtpApp.szWMSserverRoot,
			params	: {	'LAYERS'		: 	PLAN.gs_layers.CR_arcs + ',' + PLAN.gs_layers.CR_stns,
						'TILED'			: 	true,
						'TRANSPARENT'	: 	true
			}
		}),
		visible	: false
	});
	CTPS.lrtpApp.oPorts_PkRide = new ol.layer.Tile({	
		title	: 'Airports, PNR Lots, Seaports',
		source	: new ol.source.TileWMS({
			url		:  CTPS.lrtpApp.szWMSserverRoot,
			params	: {	'LAYERS'		: 	PLAN.gs_layers.airports + ',' + PLAN.gs_layers.park_ride_lots + ',' + PLAN.gs_layers.seaports,
						'TILED'			: 	true,
						'TRANSPARENT'	: 	true
			}
		}),
		visible	: false
	});
	CTPS.lrtpApp.oFerries = new ol.layer.Tile({	
		title	: 'Ferries',
		source	: new ol.source.TileWMS({
			url		:  CTPS.lrtpApp.szWMSserverRoot,
			params	: {	'LAYERS'		: 	PLAN.gs_layers.ferries,
						'TILED'			: 	true,
						'TRANSPARENT'	: 	true, 'STYLES' : 'Dest2040_ferry_routes'
			}
		}),
		visible	: false
	});
	CTPS.lrtpApp.oBikes = new ol.layer.Tile({	
		title	: 'Off-road Bicycle Facilities',
		source	: new ol.source.TileWMS({
			url		:  CTPS.lrtpApp.szWMSserverRoot,
			params	: {	'LAYERS'		: 	PLAN.gs_layers.bikes_built,
						'STYLES'		: 	'Dest2040_bikes',
						'TILED'			: 	true,
						'TRANSPARENT'	: 	true
			}
		}),
		visible	: false
	});
	CTPS.lrtpApp.oVOC = new ol.layer.Tile({	
		title	: 'Volume/Capacity Ratios: 2016 and 2040',
		source	: new ol.source.TileWMS({
			url		:  CTPS.lrtpApp.szWMSserverRoot,
			params	: {	'LAYERS'		: 	PLAN.gs_layers.VOClayer,
						'TILED'			: 	true,
						'TRANSPARENT'	: 	true
			}
		}),
		visible	: false
	});
	CTPS.lrtpApp.oCrashes = new ol.layer.Tile({	
		title	: 'All Crashes',
		source	: new ol.source.TileWMS({
			url		:  CTPS.lrtpApp.szWMSserverRoot,
			params	: {	'LAYERS'		: 	PLAN.gs_layers.crash_layer_poly + ',' + PLAN.gs_layers.crash_layer_pt,
						'TILED'			: 	true,
						'TRANSPARENT'	: 	true
			}
		}),
		visible	: false
	});
    CTPS.lrtpApp.oBikeCrashes = new ol.layer.Tile({	
		title	: 'Bicycle Crashes',
		source: new ol.source.TileWMS({
			url		:  CTPS.lrtpApp.szWMSserverRoot,
			params	: {
				'LAYERS'		: 	PLAN.gs_layers.crash_bikes_poly + ',' + PLAN.gs_layers.crash_bikes_pt,
				'TILED'			: 	true,
				'TRANSPARENT'	: 	true
			}
		}),
		visible: false
	});
	CTPS.lrtpApp.oPedCrashes = new ol.layer.Tile({	
		title	: 'Pedestrian Crashes',
		source	: new ol.source.TileWMS({
			url		:  CTPS.lrtpApp.szWMSserverRoot,
			params	: {	'LAYERS'		: 	PLAN.gs_layers.crash_peds_poly + ',' + PLAN.gs_layers.crash_peds_pt,
						'TILED'			: 	true,
						'TRANSPARENT'	: 	true
			}
		}),
		visible	: false
	});
	CTPS.lrtpApp.oRoads = new ol.layer.Tile({	
		title	: 'Major Roads',			
		source	: new ol.source.TileWMS({
			url		:  CTPS.lrtpApp.szWMSserverRoot,
			params	: {	'LAYERS'		: 	PLAN.gs_layers.major_roads,
						'STYLES'		: 	'RoadsMultiscaleGroupedBG',
						'TILED'			: 	true,
						'TRANSPARENT'	: 	true
			}
		}),
		visible	: true
	});
	CTPS.lrtpApp.oPavement = new ol.layer.Tile({	
		title	: 'Pavement Condition',
		source	: new ol.source.TileWMS({
			url		:  CTPS.lrtpApp.szWMSserverRoot,
			params	: {	'LAYERS'		: 	PLAN.gs_layers.pavement,
						'STYLES'		: 	'Dest2040_pavement_cond',
						'TILED'			: 	true,
						'TRANSPARENT'	: 	true
			}
		}),
		visible	: false
	});
	CTPS.lrtpApp.oWindowRadial = new ol.layer.Tile({	
		// title	: 'Radial Corridors',			// *** No 'title' property ==> layer will not appear in layer switcher.
		source	: new ol.source.TileWMS({
			url		:  CTPS.lrtpApp.szWMSserverRoot,
			params	: {	'LAYERS'		: 	PLAN.gs_layers.corridors,
						'TILED'			: 	true,
						'TRANSPARENT'	: 	true
			}
		}),
		visible	: false
	});
	CTPS.lrtpApp.oWindowCore = new ol.layer.Tile({	
		// title	: 'Central Circumferential Corridor', // *** No 'title' property ==> layer will not appear in layer switcher.
		source	: new ol.source.TileWMS({
			url		:  CTPS.lrtpApp.szWMSserverRoot,
			params	: {	'LAYERS'		: 	PLAN.gs_layers.central_corr,
						'STYLES'		: 	'Plan2040_corridor_Central',
						'TILED'			: 	true,
						'TRANSPARENT'	: 	true
			}
		}),
		visible	: false
	});
  
	// Define vector layers populated by WFS requests
	CTPS.lrtpApp.oHighlightLayerTowns = new ol.layer.Vector({
		// title	: 'Selected Town',					// No 'title' property ==> layer will not appear in layer switcher.
		source	: new ol.source.Vector({ wrapX: false }),
		style	: new ol.style.Style({	fill	: new ol.style.Fill({ color	: 'rgba(0, 0, 0, 0)' }), 
										stroke 	: new ol.style.Stroke({ color: "#FF0000", width: 2.5 })
									 })
	});
	CTPS.lrtpApp.oHighlightLayerTAZ = new ol.layer.Vector({
		// title	: 'Highlighted TAZ',				// No 'title' property ==> layer will not appear in layer switcher.
		source	: new ol.source.Vector({ wrapX: false }),
		style	: new ol.style.Style({	fill	: new ol.style.Fill({ color: 'rgba(255, 255, 51, 0.4)' }), 				
										stroke 	: new ol.style.Stroke({ color: "#cc0066", width: 1.5 })
									 })
	});
	CTPS.lrtpApp.oHighlightLayerBus = new ol.layer.Vector({
		// title	: 'Selected Bus Route',				// No 'title' property ==> layer will not appear in layer switcher.
		source	: new ol.source.Vector({ wrapX: false }),
		style	: new ol.style.Style({	fill	: new ol.style.Fill({ color: 'rgba(255, 0, 0, 1)' }), 
										stroke 	: new ol.style.Stroke({ color: "red", width: 3.5 })
									 })
	});
	
	// Define MA State Plane Projection and EPSG:26986/EPSG:4326 transform functions
	// because neither defined by OpenLayers, must be created manually.
	// More on custom projections: 	http://openlayers.org/en/latest/examples/wms-custom-proj.html
	//								http://openlayers.org/en/master/apidoc/ol.proj.Projection.html
	//								https://openlayers.org/en/latest/apidoc/ol.proj.html#.addCoordinateTransforms
	var projection = new ol.proj.Projection({
		code: 'EPSG:26986',
		extent: [33861.26,777514.31,330846.09,959747.44],
		units: 'm'
	});
	ol.proj.addProjection(projection);
	// proj4js: http://proj4js.org/
	// https://epsg.io/26986#
	var MaStatePlane = '+proj=lcc +lat_1=42.68333333333333 +lat_2=41.71666666666667 +lat_0=41 +lon_0=-71.5 +x_0=200000 +y_0=750000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs';
	ol.proj.addCoordinateTransforms(
		'EPSG:4326',
		projection,
		function(coordinate){
			var WGS_to_MAState = proj4(MaStatePlane).forward(coordinate);
			return WGS_to_MAState;
		},
		function(coordinate){
			var MAState_to_WGS = proj4(MaStatePlane).inverse(coordinate);
			return MAState_to_WGS;
		}
	);
	
	// Define OpenLayers v3/v4 Map
	CTPS.lrtpApp.map = new ol.Map({
		target	: 'map',
		controls: ol.control.defaults().extend([
			new ol.control.ScaleLine({
				units	: 'us'
			})
		]),
		layers	: [	CTPS.lrtpApp.oBaseLayers,
					CTPS.lrtpApp.oRoads,
					CTPS.lrtpApp.oTAZ,
					CTPS.lrtpApp.oTAZ_donut,
					CTPS.lrtpApp.oTAZ_trucks,
					CTPS.lrtpApp.oTruckGen,
					CTPS.lrtpApp.oRailFreight,
					CTPS.lrtpApp.oRT,
					CTPS.lrtpApp.oCR,
					CTPS.lrtpApp.oPorts_PkRide,
					CTPS.lrtpApp.oFerries,
					CTPS.lrtpApp.oBikes,
					CTPS.lrtpApp.oVOC,
					CTPS.lrtpApp.oPavement,
					CTPS.lrtpApp.oCrashes,
					CTPS.lrtpApp.oBikeCrashes,
					CTPS.lrtpApp.oPedCrashes,
					CTPS.lrtpApp.oWindowRadial,
					CTPS.lrtpApp.oWindowCore,
					CTPS.lrtpApp.oHighlightLayerTowns, 
					CTPS.lrtpApp.oHighlightLayerTAZ, 
					CTPS.lrtpApp.oHighlightLayerBus	],
		view	: new ol.View({
			projection: projection,
			center	: CTPS.lrtpApp.mapCenter,
			zoom	: CTPS.lrtpApp.mapZoom,
			maxZoom : 9,
			minZoom	: 1
		})
	});	

	// Layer switcher control
	// OL3/4 does not support a native layer switcher control.
	// However, an add-in has been developed: https://github.com/walkermatt/ol-layerswitcher
	// For the time being, we just enable this if in debug mode.
	// 
	// N.B. The OL 3/4 layer switcher control displayed layers in *inverse* order with respect
	// to the order in which they were added to the map. This feature/bug was fixed by BK on 02/07/2018.
	if (CTPS.lrtpApp.debugFlag) {
		var layerSwitcher = new ol.control.LayerSwitcher({ 'tipLabel' : 'Layers' });
		CTPS.lrtpApp.map.addControl(layerSwitcher);
	}

	// Define on-click event handler for OpenLayers map.
    CTPS.lrtpApp.map.on('click', CTPS.lrtpApp.onClickHandler);
	
	// Change cursor to a pointer on selectable layers. From: http://openlayers.org/en/latest/examples/getfeatureinfo-tile.html
	/* Functionality currently turned off -- (EE, 08/2017)
	CTPS.lrtpApp.map.on('pointermove', function(evt) {
		if (evt.dragging) {
			return;
		};
		var pixel = CTPS.lrtpApp.map.getEventPixel(evt.originalEvent);
		var hit = CTPS.lrtpApp.map.forEachLayerAtPixel(pixel, function() {
			return true;
		});
		CTPS.lrtpApp.map.getTargetElement().style.cursor = hit ? 'pointer' : '';
	});
	*/
	
	// Start off with table and other widgets hidden
    $('#getSETable,#downloadSEData,#clearSETable').hide();
    $('#drop_list').hide();                                                                    
    $('#downloadTRRegionwideData,#clearTRRegionTable').hide();
      
}; // CTPS.lrtpApp.init()

// On-click event handlers for linking map clicks to taz in table row and vice-versa 
//
// 	1. "onClickHandler" triggered by click on map
//  2. "highlightMapTaz" triggered by call from within on-click event handler for '#getSEData'
//
CTPS.lrtpApp.onClickHandler = function(e) {
	// Helper function: Adds color to table element associated with map click
	var do_color = function(search_value){
		$('tr td').parent().removeClass('wrappedElement');                  
		$('td:contains(' + search_value + ')').parent().addClass('wrappedElement');  
	};
/* 	
	// Not sure why the following guard was here in Mary's code. Commenting it out, at least for the time being.
	if (CTPS.lrtpApp.oTAZ.getVisible()===false) {
		console.log('No population or employment layer visible at present--\nEnable one of these layers in order to highlight clicked TAZ');
		return;
	};
*/
	var click_pt = e.coordinate;
	var oBounds = [click_pt[0] - 1, click_pt[1] - 1, click_pt[0] + 1, click_pt[1] + 1];

	var szUrl = CTPS.lrtpApp.szWFSserverRoot + '?';
	szUrl += '&service=wfs&version=1.0.0&request=getfeature';
	szUrl += '&typename=' +  PLAN.gs_layers.taz2727;
	szUrl += '&outputformat=json';
	szUrl += '&bbox=' + oBounds.join(',') + ',EPSG:26986';
	$.ajax({ url		: szUrl,
			 type		: 'GET',
			 dataType	: 'json',
			 success	: 	function (data, textStatus, jqXHR) {
								var reader = new ol.format.GeoJSON();
								var aFeatures = reader.readFeatures(jqXHR.responseText);
								if (aFeatures.length===0) {
									// User clicked outside of a MAPC area town: nothing to do.
									console.log('Only TAZs from Plan area can be highlighted');
									return;
								} else {
									// Remove existing highlights, add new highlight vector layer
									var attrs = aFeatures[0].getProperties();
									var search_value = +attrs['taz'];
									CTPS.lrtpApp.oHighlightLayerTAZ.getSource().clear();
									CTPS.lrtpApp.oHighlightLayerTAZ.getSource().addFeature(new ol.Feature(attrs));
									CTPS.lrtpApp.oHighlightLayerTAZ.setZIndex(99);
									// If no table deployed, don't go any farther with TAZ search
									if(CSSClass.is('mytabs', 'hidden')===true){;
										console.log("No data table has been invoked--relevant \nrow can't be highlighted in data table.");
										return;
									};
									// Just call do_color to highlight the row with the relevant TAZ in the table.
									// If the TAZ isn't in the table, no problem.
									// -- BK 02/06/2018
									do_color(search_value);								
									// Legacy code and comments from Mlle. MMcs:
									// Search data store associated with table to do a match with search_value from point-and-click
									//		var found = 0;
									//		var i;
									//		for(i = 0; i < CTPS.lrtpApp.myData2.length; i++) {
									//			if (CTPS.lrtpApp.myData2[i].TAZ===search_value) {
									//				found = 1;
									//				do_color(search_value);
									//			};
									//		};
									// If there is a table displayed but the clicked TAZ is not included in the table town(s), don't highlight any line in table
									// 		if (found===0 && CSSClass.is('mytabs', 'hidden')===false) {
									//			console.log('Selected TAZ does not appear in displayed table');
									//			$('tr td').parent().removeClass('wrappedElement');
									//		};				
								};
							},  
			failure		: 	function (qXHR, textStatus, errorThrown ) {
								alert('WFS request in on-click handler for map failed.\n' +
										'Status: ' + textStatus + '\n' +
										'Error:  ' + errorThrown);
							}
	});
}; // CTPS.lrtpApp.onClickHandler()

CTPS.lrtpApp.highlightMapTaz = function(selectedTAZ){  
    CTPS.lrtpApp.oHighlightLayerTAZ.getSource().clear();
    var szUrl = CTPS.lrtpApp.szWFSserverRoot + '?';
	szUrl += '&service=wfs&version=1.0.0&request=getfeature';
	szUrl += '&typename=' +  PLAN.gs_layers.taz2727;
	szUrl += '&outputformat=json';
	szUrl += '&cql_filter=(taz==' + selectedTAZ + ')'; 
	$.ajax({ url		: szUrl,
			 type		: 'GET',
			 dataType	: 'json',
			 success	: 	function (data, textStatus, jqXHR) {
								var reader = new ol.format.GeoJSON();
								var aFeatures = reader.readFeatures(jqXHR.responseText);
								if (aFeatures.length > 1) {
									// This should never happen
									alert('Error: CTPS.lrtpApp.highlightMapTaz: More than one feature returned.');
								} else if (aFeatures.length === 1) {
									var attrs = aFeatures[0].getProperties();
									CTPS.lrtpApp.oHighlightLayerTAZ.getSource().addFeature(new ol.Feature(attrs));
								};
							},  
			 failure	: 	function (qXHR, textStatus, errorThrown ) {
								alert('WFS Query in on-click handler for table failed.\n' +
										'Status: ' + textStatus + '\n' +
										'Error:  ' + errorThrown);
							}
    });     
}; // CTPS.lrtpApp.highlightMapTaz()