/*
 * ***** BEGIN LICENSE BLOCK *****
 * Version: ZPL 1.1
 * 
 * The contents of this file are subject to the Zimbra Public License
 * Version 1.1 ("License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://www.zimbra.com/license
 * 
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See
 * the License for the specific language governing rights and limitations
 * under the License.
 * 
 * The Original Code is: Zimbra Collaboration Suite Web Client
 * 
 * The Initial Developer of the Original Code is Zimbra, Inc.
 * Portions created by Zimbra are Copyright (C) 2005 Zimbra, Inc.
 * All Rights Reserved.
 * 
 * Contributor(s):
 * 
 * ***** END LICENSE BLOCK *****
 */
 /**
 * @author EMC
 **/
function ZaDistributionList(app, id, name, memberList, description, notes) {
	ZaItem.call(this, app);
	this.attrs = new Object();
	this.id = (id != null)? id: null;
	this.name = (name != null) ? name: null;
	this._selfMember = new ZaDistributionListMember(this.name);
	this._memberList = (memberList != null)? AjxVector.fromArray(memberList): new AjxVector();
	this.memberPool = new Array();
	if (description != null) this.attrs.description = description;
	if (notes != null) this.attrs.zimbraNotes = notes;
	this.numMembers = 0;
	//Utility members
	this._origList = (memberList != null)? AjxVector.fromArray(memberList): new AjxVector();
	this._addList = new AjxVector();
	this._removeList = new AjxVector();
	this._dirty = true;
	this.poolPagenum=1;
	this.poolNumPages=1;
	this.memPagenum=1;
	this.memNumPages=1;
	this.query="";
}

ZaDistributionList.prototype = new ZaItem;
ZaDistributionList.prototype.constructor = ZaDistributionList;

ZaDistributionList.EMAIL_ADDRESS = "ZDLEA";
ZaDistributionList.DESCRIPTION = "ZDLDESC";
ZaDistributionList.ID = "ZDLID";
ZaDistributionList.MEMBER_QUERY_LIMIT = 25;

ZaDistributionList.A_mailStatus = "zimbraMailStatus";
ZaDistributionList.searchAttributes = AjxBuffer.concat(ZaAccount.A_displayname,",",
													   ZaItem.A_zimbraId,  "," , 
													   ZaAccount.A_mailHost , "," , 
													   ZaAccount.A_uid ,"," , 
													   ZaAccount.A_description, ",",
													   ZaDistributionList.A_mailStatus);


// ==============================================================
// public methods
// ==============================================================

ZaDistributionList.prototype.clone = function () {
	var memberList;
	if(this._memberList) {
		memberList = this._memberList.getArray();
	}
	var dl = new ZaDistributionList(this._app, this.id, this.name, memberList, this.description, this.notes);
 	if (memberList != null) {
 		dl._memberList = new AjxVector();
 		for (var i = 0 ; i < memberList.length; ++i) {
 			dl._memberList.add(memberList[i]);
 		}
 		dl._origList = new AjxVector();
 		for (var i = 0 ; i < memberList.length; ++i) {
 			dl._origList.add(memberList[i]);
 		}
 	} else {
 		this._memberList = null;
 		this._origList = null;
 	}

	var val, tmp;
	for (key in this.attrs) {
		val = this.attrs[key];
		if (AjxUtil.isArray(val)){
			tmp = new Array();
			for (var i = 0; i < val.length; ++i){
				tmp[i] = val[i];
			}
			val = tmp;
		}
		dl.attrs[key] = val;
	}
	dl.pagenum = this.pagenum;
	dl.query = this.query;
	dl.poolPagenum = this.poolPagenum;
	dl.poolNumPages = this.poolNumPages;
	dl.memPagenum = this.memPagenum;
	dl.memNumPages = this.memNumPages;	
	return dl;
};

/**
 * Removes a list of members
 * This keeps the internal add, and remove lists up to date.
 * @param arr (Array) - array of ZaDistributionListMembers to remove
 * @return boolean (true if at least one member was removed)
 */
ZaDistributionList.prototype.removeMembers = function (arr) {
	var removed = this._removeFromList(arr, this._memberList);
	this._removeFromList(arr, this._addList);
	if (removed) {
		this._addToRemoveList(arr, this._removeList);
	}
	return removed;
};

ZaDistributionList.prototype.refresh = function () {
	this.getMembers();
}

/**
 * Adds a list of members
 * This keeps the internal add, and remove lists up to date.
 * @param arr (newMembersArrayOrVector) - array or AjxVector of ZaDistributionListMembers
 */
ZaDistributionList.prototype.addMembers = function (newMembersArrayOrVector) {
	var added = false;
	if (newMembersArrayOrVector != null) {
		// Rules:
		// Don't add yourself -- currently if you add yourself, we just do nothing.
		// Don't add duplicates.
		added = this._addToMemberList(newMembersArrayOrVector);
		this._addToAddList(newMembersArrayOrVector);
		this._removeFromRemoveList(newMembersArrayOrVector);
	}
	return added;
};

/**
 * Remove duplicates from the members list
 */
ZaDistributionList.prototype.dedupMembers = function () {
	this._dedupList(this._memberList);
};

/*
ZaDistributionList.prototype.remove = function () {
	return this._remove(this.id);
};*/

ZaDistributionList.prototype.remove = 
function(callback) {
	var soapDoc = AjxSoapDoc.create("DeleteDistributionListRequest", "urn:zimbraAdmin", null);
	soapDoc.set("id", this.id);
	this.deleteCommand = new ZmCsfeCommand();
	var params = new Object();
	params.soapDoc = soapDoc;	
	if(callback) {
		params.asyncMode = true;
		params.callback = callback;
	}
	this.deleteCommand.invoke(params);		
}

/**
 * Saves all changes to a list
 */
 /*
ZaDistributionList.prototype.saveEdits = function (obj) {
	if (this.isDirty()) {
		if (this._origName != null && this._origName != this.name) {
			// move all members to the add list, to force a re add.
			var sd = AjxSoapDoc.create("RenameDistributionListRequest", "urn:zimbraAdmin", null);
			sd.set("id", this.id);
			sd.set("newName", this.name);
			var resp = ZmCsfeCommand.invoke(sd, null, null, null, false);
		}
		sd = AjxSoapDoc.create("ModifyDistributionListRequest", "urn:zimbraAdmin", null);
		sd.set("id", this.id);
		return this._save(sd, "ModifyDistributionListResponse", true, true);
	}
		
};
*/

/**
* public rename; sends RenameDistributionListRequest soap request
**/
ZaDistributionList.prototype.rename = 
function (newName) {
	var soapDoc = AjxSoapDoc.create("RenameDistributionListRequest", "urn:zimbraAdmin", null);
	soapDoc.set("id", this.id);
	soapDoc.set("newName", newName);	
	var resp = ZmCsfeCommand.invoke(soapDoc, null, null, null, true).firstChild;
	//update itself
	this.initFromDom(resp.firstChild);	
}

/**
* @method modify
* Updates ZaDistributionList attributes (SOAP)
* @param mods set of modified attributes and their new values
*/
ZaDistributionList.prototype.modify =
function(tmpObj) {
	//update the object
	var soapDoc = AjxSoapDoc.create("ModifyDistributionListRequest", "urn:zimbraAdmin", null);
	soapDoc.set("id", this.id);
	for (var aname in tmpObj.attrs) {
		if(aname == ZaItem.A_objectClass || aname==ZaAccount.A_mail || aname == ZaItem.A_zimbraId || aname == ZaAccount.A_uid) {
			continue;
		}		
		//multi-value attribute
		if(tmpObj.attrs[aname] instanceof Array) {
			var cnt = tmpObj.attrs[aname].length;
			if(cnt) {
				for(var ix=0; ix <cnt; ix++) {
					if(tmpObj.attrs[aname][ix]) { //if there is an empty element in the array - don't send it
						var attr = soapDoc.set("a", tmpObj.attrs[aname][ix]);
						attr.setAttribute("n", aname);
					}
				}
			} else {
				var attr = soapDoc.set("a", "");
				attr.setAttribute("n", aname);
			}
		} else {
			var attr = soapDoc.set("a", tmpObj.attrs[aname]);
			attr.setAttribute("n", aname);
		}
	}

	var resp = ZmCsfeCommand.invoke(soapDoc, null, null, null, true).firstChild;
	//update itself
	this.initFromDom(resp.firstChild);

	if(tmpObj._addList) 
		this.addNewMembers(tmpObj._addList);
	
	if(tmpObj._removeList)		
		this.removeDeletedMembers(tmpObj._removeList);
		
	this.refresh();
	this.markClean();
	return true;
}

/**
* Creates a new ZaDistributionList. This method makes SOAP request to create a new account record. 
* @param tmpObj
* @param app 
* @return ZaDistributionList
**/
ZaDistributionList.create =
function(tmpObj, app) {
	
	//create SOAP request
	var soapDoc = AjxSoapDoc.create("CreateDistributionListRequest", "urn:zimbraAdmin", null);
	soapDoc.set(ZaAccount.A_name, tmpObj.name);

	for (var aname in tmpObj.attrs) {
		if(aname == ZaItem.A_objectClass || aname == ZaAccount.A_mail || aname == ZaItem.A_zimbraId || aname == ZaAccount.A_uid) {
			continue;
		}	
		
		if(tmpObj.attrs[aname] instanceof Array) {
			var cnt = tmpObj.attrs[aname].length;
			if(cnt) {
				for(var ix=0; ix <cnt; ix++) {
					var attr = soapDoc.set("a", tmpObj.attrs[aname][ix]);
					attr.setAttribute("n", aname);
				}
			} 
		} else {	
			if(tmpObj.attrs[aname] != null) {
				var attr = soapDoc.set("a", tmpObj.attrs[aname]);
				attr.setAttribute("n", aname);
			}
		}
	}
	try {
		var resp = ZmCsfeCommand.invoke(soapDoc, null, null, null, true).firstChild;
	} catch (ex) {
		switch(ex.code) {
			case ZmCsfeException.DISTRIBUTION_LIST_EXISTS:
				app.getCurrentController().popupErrorDialog(ZaMsg.ERROR_ACCOUNT_EXISTS);
			break;
			case ZmCsfeException.ACCT_EXISTS:
				app.getCurrentController().popupErrorDialog(ZaMsg.ERROR_ACCOUNT_EXISTS);
			break;
			default:
				app.getCurrentController()._handleException(ex, "ZaDistributionList.create", null, false);
			break;
		}
		return null;
	}
	var dl = new ZaDistributionList(app);
	dl.initFromDom(resp.firstChild);
	if(tmpObj._addList) {
		dl.addNewMembers(tmpObj._addList);
		dl.refresh();
	}
	dl.markClean();	
	return dl;
}


// ==============================================================
// public accessor methods
// ==============================================================

ZaDistributionList.prototype.markChanged = function () {
	this._dirty = true;
};

ZaDistributionList.prototype.markClean = function () {
	this._dirty = false;
};

ZaDistributionList.prototype.isDirty = function () {
	return this._dirty;
};

ZaDistributionList.prototype.getId = function () {
	return this.id;
};

ZaDistributionList.prototype.setId = function (id) {
	this.id = id;
};

ZaDistributionList.prototype.getName = function () {
	return this.name;
};

ZaDistributionList.prototype.setName = function (name) {
	if (name != this.name) {
		if (this._origName == null) {
			this._origName = this.name;
		}
		this.name = name;
	} 
};

ZaDistributionList.prototype.setDescription = function (description) {
	this.attrs.description = description;
};

ZaDistributionList.prototype.getDescription = function () {
	return this.attrs.description;
};

ZaDistributionList.prototype.setNotes = function (notes) {
	this.attrs.zimbraNotes = notes;
};

ZaDistributionList.prototype.getNotes = function () {
	return this.attrs.zimbraNotes;
};

ZaDistributionList.prototype.setMailStatus = function (status) {
	this.attrs.zimbraMailStatus = status;
};

ZaDistributionList.prototype.getMailStatus = function () {
	return this.attrs.zimbraMailStatus;
};


/**
 * Makes a server call to get the distribution list details, if the
 * internal list of members is null
 */
// TODO -- handle dynamic limit and offset
ZaDistributionList.prototype.getMembers = function (limit) {
	//DBG.println("Get members: memberList = " , this._memberList, "$");
	if (this.id != null) {
		this._memberList = null;
		var soapDoc = AjxSoapDoc.create("GetDistributionListRequest", "urn:zimbraAdmin", null);
		if(!limit)
			limit = ZaDistributionList.MEMBER_QUERY_LIMIT;
			
		soapDoc.setMethodAttribute("limit", limit);
		
		var offset = (this.memPagenum-1)*limit;
		soapDoc.setMethodAttribute("offset", offset);
			
		var dl = soapDoc.set("dl", this.id);
		dl.setAttribute("by", "id");
		soapDoc.set("name", this.getName());
		try {
			var resp = ZmCsfeCommand.invoke(soapDoc, null, null, null, false).Body.GetDistributionListResponse;
			//DBG.dumpObj(resp);
			var members = resp.dl[0].dlm;
			this.numMembers = resp.total;
			this.memNumPages = Math.ceil(this.numMembers/limit);
			var len = members ? members.length : 0;
			if (len > 0) {
				this._memberList = new AjxVector();
				this._origList = new AjxVector();
				for (var i =0; i < len; ++i) {
					var mem = new ZaDistributionListMember(members[i]._content);
					this._memberList.add(mem);
					this._origList.add(mem);
				}
				this._memberList.sort();
				this._origList.sort();
			}
			this.id = resp.dl[0].id;
			this.attrs = resp.dl[0]._attrs;
		} catch (ex) {
			this._app.getCurrentController()._handleException(ex, "ZaDistributionList.prototype.getMembers", null, false);
			//DBG.dumpObj(ex);
		}
	} else if (this._memberList == null){
		this._memberList = new AjxVector();
	}
	return this._memberList;
};

ZaDistributionList.prototype.getMembersArray = function () {
	if (this._memberList != null){
		return this._memberList.getArray();
	}
	return [];
};

// ==============================================================
// private internal methods
// ==============================================================

ZaDistributionList.prototype._addToMemberList = function (newMembersArrayOrVector) {
	return this._addToList(newMembersArrayOrVector, this._memberList);
};

ZaDistributionList.prototype._addToAddList = function (arrayOrVector) {
	var list = this._origList;
	var func = function (item) {
		if (list.binarySearch(item) != -1) {
			return false;
		}
		return true;
	}
	return this._addToList(arrayOrVector, this._addList, func);
};

ZaDistributionList.prototype._addToRemoveList = function (arrayOrVector) {
	var list = this._origList;
	var func = function (item) {
		if (list.binarySearch(item) == -1) {
			return false;
		}
		return true;
	}
	return this._addToList(arrayOrVector, this._removeList, func);
};

ZaDistributionList.prototype._removeFromRemoveList = function (arrayOrVector) {
	this._removeFromList(arrayOrVector, this._removeList);
};

ZaDistributionList.prototype._addToList  = function (arrayOrVector, vector, preAddCallback) {
	var added = false;
	if (AjxUtil.isArray(arrayOrVector)) {
		added = this._addArrayToList(arrayOrVector, vector, preAddCallback);
	} else if (AjxUtil.isInstance(arrayOrVector, AjxVector)){
		added = this._addVectorToList(arrayOrVector, vector, preeAddCallback);
	}
	this._dedupList(vector);
	return added;
};

/**
* Removes @param arrayOrVector from @vector, then
* removes duplicates from @param vector
* @return boolean (true if at least one member of arrayOrVector was removed from vector)
**/
ZaDistributionList.prototype._removeFromList  = function (arrayOrVector, vector) {
	var removed = false;
	if (AjxUtil.isArray(arrayOrVector)) {
		removed = this._removeArrayFromList(arrayOrVector, vector);
	}
	this._dedupList(vector);
	return removed;
};


ZaDistributionList.prototype._addArrayToList = function (newArray, vector, preAddCallback) {
	var add = true;
	var cnt = newArray.length;
	for (var i = 0; i < cnt; i++) {
		if(!newArray[i])
			continue;
			
		if (newArray[i].toString() != this._selfMember.toString()) {
			add = true;
			if (preAddCallback != null){
				add = preAddCallback(newArray[i]);
			}
			if (add) vector.add(newArray[i]);
		}
	}
	return (newArray.length > 0)? true: false;
};

ZaDistributionList.prototype._addVectorToList = function (newVector, vector) {
	var i = -1;
	var added = false;
	if ( (i = newVector.binarySearch(this._selfMember)) != -1) {
		if (i > 0){
			vector.merge(vector.size(),newVector.slice(0,i));
		}
		if (i+1 < newVector.length) {
			vector.merge(vector.size(),newVector.slice(i+1));
		}
	} else {
		vector.merge(vector.size(),newVector);
	}
	return (vector.size() > 0)? true: false;
};

/**
* removes members of @param newArray from @param vector
* @param newArray - contains members to remove 
* @param vector  - List to remove from
* @return boolean (true if at least one member was removed)
**/
ZaDistributionList.prototype._removeArrayFromList = function (newArray, vector) {
	var vecArray = vector.getArray(); //get direct reference to underlying array
	var ret = false;
	for (var i = 0; i < newArray.length ; ++i) {
		for (var j = 0; j < vecArray.length; ++j) {
			if (vecArray[j].toString() == newArray[i].toString()) {
				vecArray.splice(j,1);
				ret = true;
			}
		}
	}
	return ret;
};

ZaDistributionList.prototype._dedupList = function (vector) {
	vector.sort();
	var arr = vector.getArray();
	var len = arr.length;
	var i;
	var prev = null;
	var curr = null;
	for (i = len; i >= 0; --i) {
		curr = arr[i];
		if((curr!=null) && (prev!=null) && curr.toString() == prev.toString()) {
			arr.splice(i,1);
		} else {
			prev = curr;
		}
	}
};

ZaDistributionList.prototype.addNewMembers = function (list) {
	var addArray = list.getArray();
	var len = addArray.length;
	var addMemberSoapDoc, r, addMemberSoapDoc;
	for (var i = 0; i < len; ++i) {
		addMemberSoapDoc = AjxSoapDoc.create("AddDistributionListMemberRequest", "urn:zimbraAdmin", null);
		addMemberSoapDoc.set("id", this.id);
		addMemberSoapDoc.set("dlm", addArray[i].toString());
		r = ZmCsfeCommand.invoke(addMemberSoapDoc, null, null, null, false).Body.AddDistributionListMemberResponse;
	}
};

ZaDistributionList.prototype.removeDeletedMembers = function (list) {
	var removeArray = list.getArray();
	var len = removeArray.length;
	var addMemberSoapDoc, r, removeMemberSoapDoc;
	for (var i = 0; i < len; ++i) {
		removeMemberSoapDoc = AjxSoapDoc.create("RemoveDistributionListMemberRequest", "urn:zimbraAdmin", null);
		removeMemberSoapDoc.set("id", this.id);
		removeMemberSoapDoc.set("dlm", removeArray[i].toString());
		r = ZmCsfeCommand.invoke(removeMemberSoapDoc, null, null, null, false).Body.RemoveDistributionListMemberResponse;
	}
};

ZaDistributionList.prototype.initFromDom = function(node) {
	this.name = node.getAttribute("name");
	this._selfMember = new ZaDistributionListMember(this.name);
	this.id = node.getAttribute("id");
	this.attrs = new Object();

	var children = node.childNodes;
	for (var i=0; i< children.length;  i++) {
		var child = children[i];
		if (child.nodeName == 'a'){
			var name = child.getAttribute("n");
			if (child.firstChild != null) {
				var value = child.firstChild.nodeValue;
				if (name in this.attrs) {
					var vc = this.attrs[name];
					if ((typeof vc) == "object") {
						vc.push(value);
					} else {
						this.attrs[name] = [vc, value];
					}
				} else {
					this.attrs[name] = value;
				}
			}
		} else if (child.nodeName == 'member') {
			if (this._memberList == null) this._memberList = new AjxVector();
			this._memberList.add(child.getAttribute('name'));
		}
	}
	if (this._memberList != null){
		this._origList = new AjxVector();
 		for (var i = 0 ; i < this._memberList.length; ++i) {
 			this._origList.add(this._memberList[i]);
 		}
		this._memberList.sort();
		this._origList.sort();
	}
};


ZaDistributionList.prototype.removeAllMembers = function () {
	var arr = this._memberList.getArray();
	this.setMembers();
	this._removeFromList(arr, this._addList);
	this._addToList(arr, this._removeList);
};

ZaDistributionList.prototype.setMembers = function (list) {
	if (list == null) list = [];
	return this._memberList = AjxVector.fromArray(list);
};

/**
 * Small wrapper class for a distribution list member.
 * The id is needed at a higher level for DwtLists to work correctly.
 */
function ZaDistributionListMember (name) {
	this[ZaAccount.A_name] = name;
	this.id = "ZADLM_" + name;

}

ZaDistributionListMember.prototype.toString = function () {
	return this[ZaAccount.A_name];
};


ZaDistributionList.myXModel = {
	getMemberPool: function (model, instance) {
		return instance.memberPool;
	},
	setMemberPool: function (value, instance, parentValue, ref) {
		instance.memberPool = value;
	},
	// transform a vector into something the list view will be 
	// able to handle
	getMembersArray: function (model, instance) {
		var arr = instance.getMembersArray();
		var tmpArr = new Array();
		var tmp;
		for (var i = 0; i < arr.length; ++i ){
			tmp = arr[i];
			if (!AjxUtil.isObject(arr[i])){
				tmp = new ZaDistributionListMember(arr[i]);
			}
			tmpArr.push(tmp);
		}
		return tmpArr;
	},
	setMembersArray: function (value, instance, parentValue, ref) {
		instance.setMembers(value);
	},
	items: [
		{id:"query", type:_STRING_},
		{id:"poolPagenum", type:_NUMBER_, defaultValue:1},
		{id:"poolNumPages", type:_NUMBER_, defaultValue:1},		
		{id:"memPagenum", type:_NUMBER_, defaultValue:1},
		{id:"memNumPages", type:_NUMBER_, defaultValue:1},	
		{id: "memberPool", type:_LIST_, setter:"setMemberPool", setterScope:_MODEL_, getter: "getMemberPool", getterScope:_MODEL_},
		{id: "optionalAdd", type:_UNTYPED_},
		{id: "name", type:_STRING_, setter:"setName", setterScope: _INSTANCE_, required:true,
		 constraints: {type:"method", value:
					   function (value, form, formItem, instance) {
						   var parts = value.split('@');
						   if (parts[0] == null || parts[0] == ""){
							   // set the name, so that on refresh, we don't display old data.
							   throw ZaMsg.DLXV_ErrorNoListName;
						   } else {
							   //var re = ZaDistributionList._validEmailPattern;
							   if (AjxUtil.EMAIL_RE.test(value)) {
								   return value;
							   } else {
								   throw ZaMsg.DLXV_ErrorInvalidListName;
							   }
						   }
					   }
			}
		},
		{id: "members", type:_LIST_, getter: "getMembersArray", getterScope:_MODEL_, setter: "setMembersArray", setterScope:_MODEL_},
		{id: "description", type:_STRING_, setter:"setDescription", setterScope:_INSTANCE_, getter: "getDescription", getterScope: _INSTANCE_},
		{id: "notes", type:_STRING_, setter:"setNotes", setterScope:_INSTANCE_, getter: "getNotes", getterScope: _INSTANCE_},
		{id: "zimbraMailStatus", type:_STRING_, setter:"setMailStatus", setterScope:_INSTANCE_, getter: "getMailStatus", getterScope: _INSTANCE_}
	]
};
