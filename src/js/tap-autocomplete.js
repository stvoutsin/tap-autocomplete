/**
 *  Autocomplete for CodeMirror 2.
 *  Uses adql.js by Gregory Mantelet and votable.js (https://gitlab.com/cdsdevcorner/votable.js)
 *  Extended to allow dynamic metadata keyword loading from TAP service (TAP_SCHEMA or VOSI)
 *  @author Stelios Voutsinas (ROE)
 *  @version 11/Feb/2015
 *  @requires jQuery v1.7.2 or later
 *
 * Licensed under
 *   GPL v3 http://opensource.org/licenses/GPL-3.0
 *
 */

/**
 * TapAutocomplete class
 *
 * @param {string} params.textfieldid - The textarea ID that the TapAutocomplete class will be instantiated for.
 * @param {string} params.textAreaElement - The textarea element that the TapAutocomplete class will be instantiated for.
 * @param {string} web_service_path - The resource path that will run the TAP_SCHEMA requests and return a list of keywords
 * @param {string} tap_resource - The TAP service
 * @param {string} servicemode - Mode: TAP/VOSI/jsontree/gwt
 * @param {string} autocomplete_info_id - Id of loader element to be toggled while keywords are being loaded
 * @param {string} autocomplete_info_id - Id of loader element to be toggled while keywords are being loaded
 * @param {string} initial_catalogues - Array of strings, For each (0 or more) catalogue, fetch list of children tables on startup
 *
 * Usage Example:
 *    var params = {
 *  	textfieldid: "textfield",
 * 	    web_service_path: 'genius/autocompleteAsync',
 * 		tap_resource: 'https://gaia.esac.esa.int/tap-server/tap/',
 * 	    servicemode: "TAP",
 *      ...
 * 	  }
 *
 * var autocompleteInstance = new TapAutocomplete(params);
 *
 */

var TapAutocomplete = function(params) {

	this.istap = false;
	this.servicemode = "TAP";

	if (params.textfieldid)
		this.textfieldid = params.textfieldid;
	if (params.textAreaElement){
		this.textAreaElement = params.textAreaElement;
	} else {
		this.textAreaElement = document.getElementById(params.textfieldid);
	}
	if (params.web_service_path)
		this.web_service_path = params.web_service_path;
	if (params.html_resource)
		this.html_resource = params.html_resource;
	if (params.tap_resource)
		this.tap_resource = params.tap_resource;
	if (params.autocomplete_info_id)
		this.autocomplete_info = params.autocomplete_info_id;
	if (params.autocomplete_loader_id)
		this.autocomplete_loader = params.autocomplete_loader_id;
	if (params.servicemode)
		this.servicemode = params.servicemode;
	if (params.initial_catalogues) {
		this.initial_catalogues = params.initial_catalogues;
	} else {
		this.initial_catalogues = [];
	}
	if (params.jsontree)
		this.jsontree = params.jsontree;

	if (this.servicemode.toLowerCase() == "tap") {
		this.istap = true;
	}


	if (this.editor == null && !jQuery('.CodeMirror').length > 0) {
		CodeMirror.commands.autocomplete = function(cm) {
			CodeMirror.tapHint(cm, CodeMirror.adqlHint, {
				webServicePath: params.web_service_path,
				tapResource: params.tap_resource,
				servicemode: params.servicemode.toLowerCase(),
				autocompleteLoader: params.autocomplete_loader_id,
				autocompleteInfo: params.autocomplete_info_id,
				jsontree: params.jsontree,

			});
		}
		
		
		this.editor = CodeMirror.fromTextArea(this.textAreaElement, {
			mode: "text/x-adql",
			lineNumbers : true,
			lineWrapping : true,
			matchBrackets : true,
			indentWithTabs : true,
			tabSize : 4,
			indentUnit : 4,
			extraKeys: {
				"Ctrl-Space": "autocomplete",
			},

		});
		
		//this.editor.setSize("100%", "100%");


	}

	if (typeof this.editor.availableTags == 'undefined') {
		this.editor.availableTags = ["SELECT", "FROM", "ORDER BY", "WHERE",
			"TOP", "IN", "AND", "OR", "WITH", "DESC", "ASC", "JOIN", "AS",
			"HAVING", "ABS", "GROUP", "BY", "INNER", "OUTER", "CROSS",
			"LEFT", "RIGHT", "FULL", "ON", "USING", "MIN", "MAX", "COUNT",
			"DISTINCT", "ALL", "LIKE", "ACOS", "ASIN", "ATAN", "ATAN2",
			"COS", "SIN", "TAN", "COT", "IS", "NOT", "NULL", "NATURAL",
			"EXISTS", "BETWEEN", "AREA", "BOX", "CENTROID", "CIRCLE",
			"CONTAINS", "COORD1", "COORD2", "COORDSYS", "DISTANCE",
			"INTERSECTS", "POINT", "POLYGON", "REGION"
		];
	}

	if (params.servicemode.toLowerCase() == "tap") {
		this.load_metadata_for_autocomplete(this.initial_catalogues);
	} else if (params.servicemode.toLowerCase() == "vosi") {
		this.load_metadata_from_html();
	} else if (params.servicemode.toLowerCase() == "jsontree") {
		this.load_metadata_from_jsontree(this.initial_catalogues);
	} else if (params.servicemode.toLowerCase() == "gwt") {
		this.load_metadata_from_gwt(this.initial_catalogues);
	} else if (params.servicemode.toLowerCase() == "tapjs") {
		this.load_metadata_from_tapjs(this.initial_catalogues);
	}

	return this;
}

/**
 * Get the medata content from the HTML data to be used by the auto-completion
 * functions Store the content in the keywords list
 *
 */
TapAutocomplete.prototype.push_metadata_content_html = function(data) {

	var content = document.createElement('div');
	content.innerHTML = data;
	var tr = content.getElementsByClassName('heading');
	var tr2 = content.getElementsByClassName('expand');
	for (var i = 0; i < tr.length; i++) {
		var str = jQuery.trim(jQuery(tr[i]).justtext());
		var arr = str.split(".");
		for (var y = 0; y < arr.length; y++) {
			this.editor.availableTags.push(arr[y]);
		}
	}
	for (var i = 0; i < tr2.length; i++) {
		if (!contains(this.editor.availableTags, tr2[i].innerHTML)) {
			this.editor.availableTags.push(tr2[i].innerHTML);
		}
	}

};

/**
 * Get the medata content from the Json data to be used by the auto-completion
 * functions Store the content in the keywords list
 *
 */

TapAutocomplete.prototype.push_metadata_json = function(data) {

	if (data.length > 0) {
		for (var i = 0; i < data.length; i++) {
			var str = jQuery.trim(data[i]);
			var arr = str.split(".");
			for (var y = 0; y < arr.length; y++) {
				this.editor.availableTags.push(arr[y]);
			}
		}
	}

};

/**
 * Run Autocomplete class
 */
TapAutocomplete.prototype.run = function() {
	if (this.servicemode.toLowerCase() == "tap") {
		this.load_metadata_for_autocomplete();
	} else if (this.servicemode.toLowerCase() == "vosi") {
		this.load_metadata_from_html();
	} else if (this.servicemode.toLowerCase() == "jsontree") {
		this.load_metadata_from_jsontree();
	} else if (this.servicemode.toLowerCase() == "gwt") {
		this.load_metadata_from_gwt(this.initial_catalogues);
	} else if (params.servicemode.toLowerCase() == "tapjs") {
		this.load_metadata_from_tapjs(this.initial_catalogues);
	}
};

/**
 * Refresh autocomplete
 */
TapAutocomplete.prototype.refresh = function() {
	 if (this.editor != null && jQuery('.CodeMirror').length > 0 && this.servicemode!=null) {
		CodeMirror.commands.autocomplete = function(cm) {
			CodeMirror.tapHint(cm, CodeMirror.adqlHint, {
				webServicePath: this.web_service_path,
				tapResource: this.tap_resource,
				servicemode: this.servicemode.toLowerCase(),
				jsontree: this.jsontree,
				autocompleteInfo: this.autocomplete_info,
				autocompleteLoader: this.autocomplete_loader
			});
		}
	
		if (this.servicemode.toLowerCase() == "tap") {
			this.load_metadata_for_autocomplete(this.initial_catalogues);
		} else if (this.servicemode.toLowerCase() == "vosi") {
			this.load_metadata_from_html();
		} else if (this.servicemode.toLowerCase() == "jsontree") {
			this.load_metadata_from_jsontree(this.initial_catalogues);
		} else if (this.servicemode.toLowerCase() == "gwt") {
			this.load_metadata_from_gwt(this.initial_catalogues);
		} else if (params.servicemode.toLowerCase() == "tapjs") {
			this.load_metadata_from_tapjs(this.initial_catalogues);
		}
	 }
};

/**
 * Load catalogue tables
 *
 */
TapAutocomplete.prototype.load_catalogue_tables = function(catalogue_list) {

	if (this.servicemode.toLowerCase() == "tap") {
		this.load_metadata_for_autocomplete(catalogue_list);
	} else if (this.servicemode.toLowerCase() == "vosi") {
		this.load_metadata_from_html();
	} else if (params.servicemode.toLowerCase() == "jsontree") {
		this.load_metadata_from_jsontree();
	} else if (params.servicemode.toLowerCase() == "gwt") {
		this.load_metadata_from_gwt(this.initial_catalogues);
	} else if (params.servicemode.toLowerCase() == "tapjs") {
		this.load_metadata_from_tapjs(this.initial_catalogues);
	}
};

/**
 * Load metadata for autocomplete from HTML resource. Talks with a Web service
 * that fetches the initial list of keywords
 *
 */
TapAutocomplete.prototype.load_metadata_from_html = function() {
	_this = this;

	if (_this.autocomplete_info)
		jQuery("#" + _this.autocomplete_info).html(
			"Loading catalogue metadata keywords for auto-complete");
	if (_this.autocomplete_loader)
		jQuery("#" + _this.autocomplete_loader).show();

	/**
	 * Check whether an object (obj) is contained in a list (a)
	 *
	 */
	function contains(a, obj) {
		var i = a.length;
		while (i--) {
			if (a[i] === obj) {
				return true;
			}
		}
		return false;
	}

	function push_metadata_content_html(data) {
		if (!_this.editor.availableTags) {
			_this.editor.availableTags = [];
		}

		var content = document.createElement('div');
		content.innerHTML = data;
		var tr = content.getElementsByClassName('heading');
		var tr2 = content.getElementsByClassName('expand');
		for (var i = 0; i < tr.length; i++) {
			var str = jQuery.trim(jQuery(tr[i]).text());
			var arr = str.split(".");
			for (var y = 0; y < arr.length; y++) {
				_this.editor.availableTags.push(arr[y]);
			}
		}

		for (var i = 0; i < tr2.length; i++) {
			if (!contains(_this.editor.availableTags, tr2[i].innerHTML)) {
				_this.editor.availableTags.push(tr2[i].innerHTML);
			}
		}

	}

	jQuery.ajax({
		type: "POST",
		async: false,
		dataType: "json",
		data: {
			resource: _this.html_resource,
			mode: "vosi"
		},
		url: _this.web_service_path,
		timeout: 1000000,
		error: function() {
			if (_this.autocomplete_info)
				jQuery("#" + _this.autocomplete_info).html(
					"CTRL + Space to activate auto-complete");
			if (_this.autocomplete_loader)
				jQuery("#" + _this.autocomplete_loader).hide();

		},
		success: function(data) {

			if (data) {
				push_metadata_content_html(data);
			}
			if (_this.autocomplete_info)
				jQuery("#" + _this.autocomplete_info).html(
					"CTRL + Space to activate auto-complete");
			if (_this.autocomplete_loader)
				jQuery("#" + _this.autocomplete_loader).hide();

		}
	});
};


/**
 * Load metadata for autocomplete from JSON array.
 *
 */
TapAutocomplete.prototype.load_metadata_from_jsontree = function(optional_catalogues) {
	_this = this;

	if (_this.autocomplete_info)
		jQuery("#" + _this.autocomplete_info).html(
			"Loading catalogue metadata keywords for auto-complete");
	if (_this.autocomplete_loader)
		jQuery("#" + _this.autocomplete_loader).show();


	/**
	 * Check whether an object (obj) is contained in a list (a)
	 *
	 */
	function contains(a, obj) {
		var i = a.length;
		while (i--) {
			if (a[i] === obj) {
				return true;
			}
		}
		return false;
	}


	function push_metadata_json(data) {
		var objectarr = [];

		if (data.length > 0) {
			for (var i = 0; i < data.length; i++) {
				if (optional_catalogues) {
					if (contains(optional_catalogues, data[i]["catalogue"])) {
						var catalogue_tables = data[i]["tables"].map(function(a) {
							return a.name;
						});
						_this.editor.availableTags = _this.editor.availableTags.concat(catalogue_tables);
					}
				}
				_this.editor.availableTags.push(data[i]["catalogue"]);
			}
		}

	}

	push_metadata_json(_this.jsontree);

};


/**
 * Load metadata for autocomplete. Talks with a Web service that fetches the
 * initial list of keywords
 *
 */
TapAutocomplete.prototype.load_metadata_for_autocomplete = function(
	optional_catalogues) {
	_this = this;
	
	optional_catalogues = (typeof optional_catalogues === 'undefined') ? [] : optional_catalogues;

	if (_this.autocomplete_info)
		jQuery("#" + _this.autocomplete_info).html(
			"Loading catalogue metadata keywords for auto-complete");
	if (_this.autocomplete_loader)
		jQuery("#" + _this.autocomplete_loader).show();

	function push_metadata_json(data) {
		if (data.length > 0) {
			for (var i = 0; i < data.length; i++) {
				var str = jQuery.trim(data[i]);
				var arr = str.split(".");
				for (var y = 0; y < arr.length; y++) {
					_this.editor.availableTags.push(arr[y]);
				}
			}
		}

	}

	optional_catalogues = JSON.stringify(optional_catalogues);

	jQuery.ajax({
		type: "POST",
		dataType: "json",
		async: false,
		data: {
			resource: _this.tap_resource,
			optional_catalogues: optional_catalogues,
			mode: "tap",
		},
		url: _this.web_service_path,
		timeout: 1000000,
		error: function(e) {
			if (_this.autocomplete_info)
				jQuery("#" + _this.autocomplete_info).html(
					"CTRL + Space to activate auto-complete");
			if (_this.autocomplete_loader)
				jQuery("#" + _this.autocomplete_loader).hide();
		},
		success: function(data) {

			if (data) {
				push_metadata_json(data);
			}
			if (_this.autocomplete_info)
				jQuery("#" + _this.autocomplete_info).html(
					"CTRL + Space to activate auto-complete");
			if (_this.autocomplete_loader)
				jQuery("#" + _this.autocomplete_loader).hide();
		}
	});
	
	};

/**
 * Load metadata for autocomplete. Talks with a GWT Web service that fetches the
 * initial list of keywords
 *
 */
TapAutocomplete.prototype.load_metadata_from_gwt = function(
		optional_catalogues) {
		_this = this;


		optional_catalogues = (typeof optional_catalogues === 'undefined') ? [] : optional_catalogues;

		if (_this.autocomplete_info)
			jQuery("#" + _this.autocomplete_info).html(
				"Loading catalogue metadata keywords for auto-complete");
		if (_this.autocomplete_loader)
			jQuery("#" + _this.autocomplete_loader).show();

		function push_metadata_json(data) {
			if (data.length > 0) {
				for (var i = 0; i < data.length; i++) {
					var str = jQuery.trim(data[i]);
					var arr = str.split(".");
					for (var y = 0; y < arr.length; y++) {
						_this.editor.availableTags.push(arr[y]);
					}
				}
			}

		}
		 
		var matches = window.gacsGetByKeyword("");
		if (matches) push_metadata_json(matches);
		 
	};

	/**
	 * Wrapper for Votable.js, query queryURLStr return tableData 
	 */
	function votableJSQuery(queryURLStr){
			var p = new VOTableParser();
			p.loadFile(queryURLStr);

		    var nbResources = p.getNbResourcesInFile();
		    var nbTablesInResource = 0;
		    var currentTableGroups = [];
		    var currentTableFields = [];
		    var currentTableData = [[]];

		    for(var i = 0; i < nbResources; i++) {
		        p.selectResource(i);
		        nbTablesInResource = p.getCurrentResourceNbTables();
		        for(var j = 0; j < nbTablesInResource; j++) {
		            p.selectTable(j);
		            //currentTableGroups = p.getCurrentTableGroups();
		            //currentTableFields = p.getCurrentTableFields();
		            currentTableData = p.getCurrentTableData();
		            

		            // ... do something
		        }
		    }
		    // ... do something again
		    p.cleanMemory();
		    return currentTableData;

	  }



	/**
	 * Load metadata for autocomplete. Talks with a Web service that fetches the
	 * initial list of keywords
	 *
	 */
	TapAutocomplete.prototype.load_metadata_from_tapjs = function(
		optional_catalogues) {
		_this = this;

		
		optional_catalogues = (typeof optional_catalogues === 'undefined') ? [] : optional_catalogues;
		var getRequestString = _this.tap_resource + "/sync?REQUEST=doQuery&VERSION=1.0&FORMAT=VOTABLE&LANG=ADQL&QUERY=";
		
		if (_this.autocomplete_info)
			jQuery("#" + _this.autocomplete_info).html(
				"Loading catalogue metadata keywords for auto-complete");
		if (_this.autocomplete_loader)
			jQuery("#" + _this.autocomplete_loader).show();


		
		function push_metadata_json(data) {
			if (data.length > 0) {
				for (var i = 0; i < data.length; i++) {
					var str = jQuery.trim(data[i]);
					var arr = str.split(".");
					for (var y = 0; y < arr.length; y++) {
						_this.editor.availableTags.push(arr[y]);
					}
				}
			}

		}

		var array = []
		
		if (optional_catalogues.length>0) {
		    var newArr = [];
			for (var i = 0; i < optional_catalogues.length; i++) {

				query = "SELECT top 10 t.table_name, s.schema_name FROM TAP_SCHEMA.tables as t, TAP_SCHEMA.schemas as s WHERE t.schema_name='" + optional_catalogues[i]
						+ "'";
				queryURLStr = getRequestString + escape(query);
				console.log(queryURLStr);
			    newArr = votableJSQuery(queryURLStr);
				for (var y = 0; y < newArr.length; y++) {
		
					array.push(newArr[y][0]);
					array.push(newArr[y][1]);

				}
			}

		} else {
		
			query = "SELECT schema_name FROM TAP_SCHEMA.schemas";
			var queryURLStr = getRequestString + escape(query);
			array = votableJSQuery(queryURLStr);

		}

		push_metadata_json(array);

		if (_this.autocomplete_info)
			jQuery("#" + _this.autocomplete_info).html(
				"CTRL + Space to activate auto-complete");
		if (_this.autocomplete_loader)
			jQuery("#" + _this.autocomplete_loader).hide();

		
		};
		
TapAutocomplete.prototype.focus = function(){ if (this.editor != null && jQuery('.CodeMirror').length > 0) {this.editor.focus();}};

TapAutocomplete.prototype.setValue = function(){ if (this.editor != null && jQuery('.CodeMirror').length > 0) {this.editor.setValue();}};

TapAutocomplete.prototype.getValue = function(){ if (this.editor != null && jQuery('.CodeMirror').length > 0) {this.editor.getValue();}};

TapAutocomplete.prototype.updateData = function(matches){ if (this.editor != null && jQuery('.CodeMirror').length > 0) {}};



