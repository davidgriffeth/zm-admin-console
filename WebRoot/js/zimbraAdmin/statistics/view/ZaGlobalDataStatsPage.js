/**
* @class ZaGlobalDataStatsPage 
* @contructor ZaGlobalDataStatsPage
* @param parent
* @param app
* @author Greg Solovyev
**/
function ZaGlobalDataStatsPage (parent, app) {
	DwtTabViewPage.call(this, parent);
	this._fieldIds = new Object(); //stores the ids of all the form elements
	this._app = app;
	this._createHTML();
	this.initialized=false;
	this.setScrollStyle(DwtControl.SCROLL);	
}
 
ZaGlobalDataStatsPage.prototype = new DwtTabViewPage;
ZaGlobalDataStatsPage.prototype.constructor = ZaGlobalDataStatsPage;

ZaGlobalDataStatsPage.prototype.toString = 
function() {
	return "ZaGlobalDataStatsPage";
}

ZaGlobalDataStatsPage.prototype._createHTML = 
function () {
	var idx = 0;
	var html = new Array(50);
	html[idx++] = "<div style='width:70ex;'>";	
	html[idx++] = "<table cellpadding='5' cellspacing='4' border='0' align='left'>";	
	html[idx++] = "<tr valign='top'><td align='left' class='StatsImageTitle'>" + AjxStringUtil.htmlEncode(ZaMsg.NAD_StatsDataZastDay) + "</td></tr>";	
	html[idx++] = "<tr valign='top'><td align='left'>";
	html[idx++] = "<img src='/service/statsimg/$y$temw1de/rcvddata/d/1'>";
	html[idx++] = "</td></tr>";
	html[idx++] = "<tr valign='top'><td align='left'>&nbsp;&nbsp;</td></tr>";	
	html[idx++] = "<tr valign='top'><td align='left' class='StatsImageTitle'>" + AjxStringUtil.htmlEncode(ZaMsg.NAD_StatsDataZast3Months) + "</td></tr>";	
	html[idx++] = "<tr valign='top'><td align='left'>";
	html[idx++] = "<img src='/service/statsimg/$y$temw1de/rcvddata/m/3'>";
	html[idx++] = "</td></tr>";
	html[idx++] = "<tr valign='top'><td align='left'>&nbsp;&nbsp;</td></tr>";		
	html[idx++] = "<tr valign='top'><td align='left' class='StatsImageTitle'>" + AjxStringUtil.htmlEncode(ZaMsg.NAD_StatsDataZast12Months) + "</td></tr>";	
	html[idx++] = "<tr valign='top'><td align='left'>";
	html[idx++] = "<img src='/service/statsimg/$y$temw1de/rcvddata/m/12'>";
	html[idx++] = "</td></tr>";
	html[idx++] = "</table>";
	html[idx++] = "</div>";
	this.getHtmlElement().innerHTML = html.join("");
}