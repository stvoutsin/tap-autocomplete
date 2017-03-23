/**
 *  Autocomplete for CodeMirror 2.
 *  Uses adql.js by Gregory Mantelet
 *  Extended to allow dynamic metadata keyword loading from webservice
 *  @author Stelios Voutsinas (ROE)
 *  @version 11/Feb/2015
 */
(function() {


  function forEach(arr, f) {
    for (var i = 0, e = arr.length; i < e; ++i) f(arr[i]);
  }

  function jsArrayContains(arr, item) {

    if (!Array.prototype.indexOf) {
      var i = arr.length;
      while (i--) {
        if (arr[i].toUpperCase() === item.toUpperCase()) {
          return true;
        }
      }
      return false;
    }
    var arr2 = arr.map(function(elem) {
      return elem.toLowerCase();
    });
    return arr2.indexOf(item.toLowerCase()) != -1;
  }


  CodeMirror.tapHint = function(editor, getHints, givenOptions) {
	 var Pos = CodeMirror.Pos;
	  var tables;
	  var defaultTable;
	  var keywords;
	  var CONS = {
	    QUERY_DIV: ";",
	    ALIAS_KEYWORD: "AS"
	  };
    // Determine effective options based on given values and defaults.
    var options = {},
      defaults = CodeMirror.tapHint.defaults;

    if (givenOptions["tapResource"]) editor.tapResource = givenOptions["tapResource"];
    if (givenOptions["webServicePath"]) editor.webServicePath = givenOptions["webServicePath"];
    if (givenOptions["autocompleteLoader"]) editor.autocompleteLoader = givenOptions["autocompleteLoader"];
    if (givenOptions["autocompleteInfo"]) editor.autocompleteInfo = givenOptions["autocompleteInfo"];
    if (givenOptions["servicemode"]) editor.servicemode = givenOptions["servicemode"];
    if (givenOptions["jsontree"]) editor.jsontree = givenOptions["jsontree"];
    if (givenOptions["availableTags"]) {
      editor.availableTags = givenOptions["availableTags"];
    } else {
      if (!editor.availableTags) {
        editor.availableTags = [
          "SELECT", "FROM", "ORDER BY", "WHERE", "TOP", "IN", "AND", "OR", "WITH", "DESC", "ASC", "JOIN", "AS", "HAVING", "ABS",
          "GROUP", "BY", "INNER", "OUTER", "CROSS", "LEFT", "RIGHT", "FULL", "ON", "USING", "MIN", "MAX", "COUNT", "DISTINCT", "ALL", "LIKE", "ACOS", "ASIN", "ATAN", "ATAN2", "COS", "SIN", "TAN", "COT", "IS", "NOT", "NULL", "NATURAL", "EXISTS", "BETWEEN", "AREA", "BOX", "CENTROID", "CIRCLE", "CONTAINS", "COORD1", "COORD2", "COORDSYS", "DISTANCE", "INTERSECTS", "POINT", "POLYGON", "REGION"
        ];
      }
    }

    for (var opt in defaults)
      if (defaults.hasOwnProperty(opt)) {
        options[opt] = (givenOptions && givenOptions.hasOwnProperty(opt) ? givenOptions : defaults)[opt];
      }


    function collectHints(previousToken) {
      // We want a single cursor position.
      if (editor.somethingSelected()) return;

      var tempToken = editor.getTokenAt(editor.getCursor());

      // Don't show completions if token has changed and the option is set.
      if (options.closeOnTokenChange && previousToken != null &&
        (tempToken.start != previousToken.start || tempToken.type != previousToken.type)) {
        return;
      }
      var result = getHints(editor, givenOptions);
      if (!result || !result.list.length) return;
      var completions = result.list;

      function insert(str) {
        editor.replaceRange(str, result.from, result.to);
      }
      // When there is only one completion, use it directly.
      if (options.completeSingle && completions.length == 1) {
        insert(completions[0]);
        return true;
      }

      // Build the select widget
      var complete = document.createElement("div");
      complete.className = "CodeMirror-completions";
      var sel = complete.appendChild(document.createElement("select"));
      // Opera doesn't move the selection when pressing up/down in a
      // multi-select, but it does properly support the size property on
      // single-selects, so no multi-select is necessary.
      if (!window.opera) sel.multiple = true;
      for (var i = 0; i < completions.length; ++i) {
        var opt = sel.appendChild(document.createElement("option"));
        opt.appendChild(document.createTextNode(completions[i]));
      }
      sel.firstChild.selected = true;
      sel.size = Math.min(10, completions.length);
      var pos = editor.cursorCoords(options.alignWithWord ? result.from : null);
      complete.style.left = pos.left + "px";
      complete.style.top = pos.bottom + "px";
      document.body.appendChild(complete);
      // If we're at the edge of the screen, then we want the menu to appear on the left of the cursor.
      var winW = window.innerWidth || Math.max(document.body.offsetWidth, document.documentElement.offsetWidth);
      if (winW - pos.left < sel.clientWidth)
        complete.style.left = (pos.left - sel.clientWidth) + "px";
      // Hack to hide the scrollbar.
      if (completions.length <= 10)
        complete.style.width = (sel.clientWidth - 1) + "px";

      var done = false;

      function close() {
        if (done) return;
        done = true;
        complete.parentNode.removeChild(complete);
      }

      function pick() {
        insert(completions[sel.selectedIndex]);
        close();
        setTimeout(function() {
          editor.focus();
        }, 50);
      }
      CodeMirror.on(sel, "blur", close);
      CodeMirror.on(sel, "keydown", function(event) {
        var code = event.keyCode;
        // Enter
        if (code == 13) {
          CodeMirror.e_stop(event);
          pick();
        }
        // Escape
        else if (code == 27) {
          CodeMirror.e_stop(event);
          close();
          editor.focus();
        } else if (code != 38 && code != 40 && code != 33 && code != 34 && !CodeMirror.isModifierKey(event)) {
          close();
          editor.focus();
          // Pass the event to the CodeMirror instance so that it can handle things like backspace properly.
          editor.triggerOnKeyDown(event);
          // Don't show completions if the code is backspace and the option is set.
          if (!options.closeOnBackspace || code != 8) {
            setTimeout(function() {
              collectHints(tempToken);
            }, 50);
          }
        }
      });
      CodeMirror.on(sel, "dblclick", pick);

      sel.focus();
      // Opera sometimes ignores focusing a freshly created node
      if (window.opera) setTimeout(function() {
        if (!done) sel.focus();
      }, 100);
      return true;
    }
    return collectHints();
  };


  CodeMirror.tapHint.defaults = {
    closeOnBackspace: true,
    closeOnTokenChange: false,
    completeSingle: true,
    alignWithWord: true,


  };

  function sleep(milliseconds) {
    var start = new Date().getTime();
    for (var i = 0; i < 1e7; i++) {
      if ((new Date().getTime() - start) > milliseconds) {
        break;
      }
    }

  }

  function getCompletionsJsontree(token, context, keywords, options, editor, optional_keyword) {
    optional_keyword = (typeof optional_keyword === 'undefined') ? '' : optional_keyword;
    var found = [],
      start = token.string;

    function maybeAdd(str) {
      if (str.toLowerCase().indexOf(start.toLowerCase()) == 0 && !jsArrayContains(found, str)) found.push(str);
    }

    function gatherCompletions(obj) {
      if (typeof obj == "string") forEach(editor.availableTags, maybeAdd);
      else if (obj instanceof Array) forEach(editor.availableTags, maybeAdd);
      else if (obj instanceof Function) forEach(editor.availableTags, maybeAdd);
      for (var name in obj) maybeAdd(name);
    }

    if (context) {
      // If this is a property, see if it belongs to some object we can
      // find in the current environment.
      var obj = context.pop(),
        base;
      var break_loop = false;

      for (var i = 0; i < editor.jsontree.length; i++) {
        $.each(editor.jsontree[i], function(key, value) {

          if (key.toLowerCase() == "catalogue") {

            if (obj.string == value) {

              if (optional_keyword) {
                var temparr = editor.jsontree[i]["tables"].filter(function(item) {
                  return item["name"].indexOf(optional_keyword) == 0;
                });
                found = found.concat(temparr.map(function(a) {
                  return a.name;
                }));
              } else {
                found = found.concat(editor.jsontree[i]["tables"].map(function(a) {
                  return a.name;
                }));
              }

              break_loop = true;
              return false;

            }

          } else if (key.toLowerCase() == "tables") {
            for (var x = 0; x < editor.jsontree[i]["tables"].length; x++) {

              if (obj.string == editor.jsontree[i]["tables"][x]["name"]) {
                if (optional_keyword) {
                  var temparr = editor.jsontree[i]["tables"][x]["columns"].filter(function(item) {
                    return item.indexOf(optional_keyword) == 0;
                  });
                  found = found.concat(temparr);
                } else {
                  found = found.concat(editor.jsontree[i]["tables"][x]["columns"]);

                }
              }
            }
          }

        });

        if (break_loop) break;

      }

      return found.sort();


    } else {

      // If not, just look in the window object and any local scope
      // (reading into JS mode internals to get at the local and global variables)

      forEach(keywords, maybeAdd);
      return found.sort();
    }

  }

  function getCompletionsAdql(token, context, keywords, options, editor, optional_keyword) {
    optional_keyword = (typeof optional_keyword === 'undefined') ? '' : optional_keyword;
    var found = [],
      start = token.string;

    function maybeAdd(str) {

      if (str.toLowerCase().indexOf(start.toLowerCase()) == 0 && !jsArrayContains(found, str)) found.push(str);
    }

    function gatherCompletions(obj) {
      if (typeof obj == "string") forEach(editor.availableTags, maybeAdd);
      else if (obj instanceof Array) forEach(editor.availableTags, maybeAdd);
      else if (obj instanceof Function) forEach(editor.availableTags, maybeAdd);
      for (var name in obj) maybeAdd(name);
    }

    if (context) {

      // If this is a property, see if it belongs to some object we can
      // find in the current environment.
      var obj = context.pop(),
        base;
      loadMetadataForAutocomplete(obj.string, start, found, editor, optional_keyword);
      return found.sort();


    } else {

      // If not, just look in the window object and any local scope
      // (reading into JS mode internals to get at the local and global variables)

      forEach(keywords, maybeAdd);
      return found.sort();
    }

  }



  function getCompletionsGWT(token, context, keywords, options, editor, optional_keyword) {
    optional_keyword = (typeof optional_keyword === 'undefined') ? '' : optional_keyword;
    var found = [],
      start = token.string;
  
    function maybeAdd(str) {

      if (str.toLowerCase().indexOf(start.toLowerCase()) == 0 && !jsArrayContains(found, str)) found.push(str);
    }

    function gatherCompletions(obj) {
      if (typeof obj == "string") forEach(editor.availableTags, maybeAdd);
      else if (obj instanceof Array) forEach(editor.availableTags, maybeAdd);
      else if (obj instanceof Function) forEach(editor.availableTags, maybeAdd);
      for (var name in obj) maybeAdd(name);
    }

    if (context) {

      // If this is a property, see if it belongs to some object we can
      // find in the current environment.
      var obj = context.pop(),
        base;
      loadMetadataForGWT(optional_keyword, start, found, editor, optional_keyword);
      return found.sort();


    } else {
      // If not, just look in the window object and any local scope
      // (reading into JS mode internals to get at the local and global variables)
      loadMetadataForGWT(optional_keyword, start, found, editor, optional_keyword);

      forEach(keywords, maybeAdd);
      return found.sort();
    }


    

  }
  
  function getCompletionsTapJs(token, context, keywords, options, editor, optional_keyword) {  
	    optional_keyword = (typeof optional_keyword === 'undefined') ? '' : optional_keyword;
	    var found = [],
	      start = token.string;

	    function maybeAdd(str) {

	      if (str.toLowerCase().indexOf(start.toLowerCase()) == 0 && !jsArrayContains(found, str)) found.push(str);
	    }

	    function gatherCompletions(obj) {
	      if (typeof obj == "string") forEach(editor.availableTags, maybeAdd);
	      else if (obj instanceof Array) forEach(editor.availableTags, maybeAdd);
	      else if (obj instanceof Function) forEach(editor.availableTags, maybeAdd);
	      for (var name in obj) maybeAdd(name);
	    }

	    if (context) {

	      // If this is a property, see if it belongs to some object we can
	      // find in the current environment.
	      var obj = context.pop(),
	        base;
	      loadMetadataForAutocompleteTapJs(obj.string, start, found, editor, optional_keyword);
	      return found.sort();


	    } else {

	      // If not, just look in the window object and any local scope
	      // (reading into JS mode internals to get at the local and global variables)

	      forEach(keywords, maybeAdd);
	      return found.sort();
	    }


	  }
	  
  
  /**
   * Load the medata content from (data) to be used by the
   * auto-completion functions Store the content in the
   * tags list
   *
   */
  function pushMetadataJson(data, tags, start, keyword) {

    if (data.length > 0) {
      for (var i = 0; i < data.length; i++) {

        var str = jQuery.trim(data[i]);
        var arr = str.split(".");
        for (var y = 0; y < arr.length; y++) {

          if (arr[y].toLowerCase().indexOf(start.toLowerCase()) == 0 && !jsArrayContains(tags, arr[y]) && !(arr[y].toLowerCase() == keyword.toLowerCase())) tags.push(arr[y]);

        }
      }
    }

  }



  /**
   *  Load metadata for autocomplete
   *  Sends Ajax request to autocomplete service with keyword & optional keyword
   *
   */
  function loadMetadataForAutocomplete(keyword, parentText, tags, editor, optional_keyword) {

    optional_keyword = (typeof optional_keyword === 'undefined') ? '' : optional_keyword;

    if (editor.autocompleteInfo) jQuery("#" + editor.autocompleteInfo).html("Loading catalogue metadata keywords for auto-complete");
    if (editor.autocompleteLoader) jQuery("#" + editor.autocompleteLoader).show();


    jQuery.ajax({
      type: "POST",
      dataType: "json",
      async: false,
      data: {
        keyword: keyword,
        optional_keyword: optional_keyword,
        mode: "tap",
        resource: editor.tapResource

      },
      url: editor.webServicePath,
      timeout: 1000000,
      error: function() {
        if (editor.autocompleteInfo) jQuery("#" + editor.autocompleteInfo).html("CTRL + Space to activate auto-complete");
        if (editor.autocompleteLoader) jQuery("#" + editor.autocompleteLoader).hide();
      },
      success: function(data) {
        if (data) {
          pushMetadataJson(data, tags, parentText, keyword);
        }

        if (editor.autocompleteInfo) jQuery("#" + editor.autocompleteInfo).html("CTRL + Space to activate auto-complete");
        if (editor.autocompleteLoader) jQuery("#" + editor.autocompleteLoader).hide();
      }

    });

    return;
  }

  

  /**
   *  Load metadata for autocomplete from GWT
   *
   */
  function loadMetadataForGWT(keyword, parentText, tags, editor, optional_keyword) {

    optional_keyword = (typeof optional_keyword === 'undefined') ? '' : optional_keyword;

    if (editor.autocompleteInfo) jQuery("#" + editor.autocompleteInfo).html("Loading catalogue metadata keywords for auto-complete");
    if (editor.autocompleteLoader) jQuery("#" + editor.autocompleteLoader).show();

    if (optional_keyword){
    	// Placeholder
    	// window.getByKeyword(keyword);	 
		var matches = window.gacsGetByKeyword(optional_keyword);
		if (matches) pushMetadataJson(matches, tags, parentText, "");

    } else {
    	var matches = window.gacsGetByKeyword("");
    	if (matches) pushMetadataJson(matches, tags, parentText, "");
    }
    
    return;
  }

  /**
   *  Load metadata for autocomplete using votable.js TAP request
   *  Sends request to TAP service (TAP_SCHEMA)
   *
   */
  function loadMetadataForAutocompleteTapJs(keyword, parentText, tags, editor, optional_keyword) {

    optional_keyword = (typeof optional_keyword === 'undefined') ? '' : optional_keyword;

    if (editor.autocompleteInfo) jQuery("#" + editor.autocompleteInfo).html("Loading catalogue metadata keywords for auto-complete");
    if (editor.autocompleteLoader) jQuery("#" + editor.autocompleteLoader).show();
    
	var getRequestString = editor.tapResource + "/sync?REQUEST=doQuery&VERSION=1.0&FORMAT=VOTABLE&LANG=ADQL&QUERY=";

	var array= [];
	//Number of dots
	var count_dots = keyword.length - keyword.replace(".", "").length;
    if (count_dots >= 2) {

		query = "SELECT column_name FROM TAP_SCHEMA.columns WHERE table_name LIKE '%." + keyword
				+ "' OR  table_name='" + keyword + "'";
		if (optional_keyword != null && optional_keyword != "") {
			query += " AND (column_name LIKE '" + optional_keyword + "%' OR column_name LIKE '" + keyword + "."
					+ optional_keyword + "%')";
		}
		
		var queryURLStr = getRequestString + escape(query);
		array = votableJSQuery(queryURLStr);
	// If no keyword is not empty, Check tables, and then columns if no tables found with keyword
	// (A table name in TAP_SCHEMA may look like schema.tablename or tablename, need to find either)
	} else if (keyword != "") {

		query = "SELECT table_name FROM TAP_SCHEMA.tables WHERE schema_name='" + keyword + "'";
		if (optional_keyword != null && optional_keyword != "") {
			query += " AND (table_name LIKE '" + optional_keyword + "%' OR table_name LIKE '" + keyword + "."
					+ optional_keyword + "%')";
		}
		
		var queryURLStr = getRequestString + escape(query);
		array = votableJSQuery(queryURLStr);
		// No tables foundm check columns for keyword
		if (array.length <= 0) {

			query = "SELECT column_name FROM TAP_SCHEMA.columns WHERE table_name LIKE '%." + keyword
					+ "' OR  table_name='" + keyword + "'";
			if (optional_keyword != null && optional_keyword != "") {
				query += " AND (column_name LIKE '" + optional_keyword + "%' OR column_name LIKE '" + keyword + "."
						+ optional_keyword + "%')";

			}
			queryURLStr = getRequestString + escape(query);
			array = votableJSQuery(queryURLStr);

		}

		//if (optional_keyword != null && optional_keyword != "") {
		//	array = filter_name(array, optional_keyword);
		//}

	} else {
		// No keyword found, get initial list of schemas or tables
/*
		try {
			JSONArray json_array = null;
			if (optional_catalogues != "" && optional_catalogues != null) {
				json_array = new JSONArray(optional_catalogues);
			}
			
			if (json_array.length()>0) {
			
				for (int i = 0; i < json_array.length(); i++) {

					query = "SELECT t.table_name, s.schema_name FROM TAP_SCHEMA.tables as t, TAP_SCHEMA.schemas as s WHERE t.schema_name='" + json_array.get(i)
							+ "'";
					String queryURLStr = tapService + getRequestString
							+ URLEncoder.encode(query, "UTF-8");
					JSONArray newArray = starTableToJSONArray(urlToStartable(queryURLStr));
					for (int y = 0; y < newArray.length(); y++) {
						array.put(newArray.get(y));
					}
				}

			} else {
			*/
				query = "SELECT schema_name FROM TAP_SCHEMA.schemas";
				var queryURLStr = getRequestString + URLEncoder.encode(query);
				array = votableJSQuery(queryURLStr);

//			}

	}
    console.log(query);
    console.log(queryURLStr);
    console.log(array);
    pushMetadataJson(array, tags, parentText, keyword);
    

    if (editor.autocompleteInfo) jQuery("#" + editor.autocompleteInfo).html("CTRL + Space to activate auto-complete");
    if (editor.autocompleteLoader) jQuery("#" + editor.autocompleteLoader).hide();

    return;
  }
  

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
   * Get autocomplete keywords for given token
   */
  function getCompletions(token, context, keywords, options) {
    var found = [],
      start = token.string;
    function maybeAdd(str) {

      if (str.toLowerCase().indexOf(start.toLowerCase()) == 0 && !jsArrayContains(found, str)) found.push(str);
    }
    function gatherCompletions(obj) {
      if (typeof obj == "string") forEach(editor.availableTags, maybeAdd);
      else if (obj instanceof Array) forEach(editor.availableTags, maybeAdd);
      else if (obj instanceof Function) forEach(editor.availableTags, maybeAdd);
      for (var name in obj) maybeAdd(name);
    }

    if (context) {
      // If this is a property, see if it belongs to some object we can
      // find in the current environment.
      var obj = context.pop(),
        base;


      if (obj.type.indexOf("variable") === 0) {
        if (options && options.additionalContext)
          base = options.additionalContext[obj.string];
        base = base || window[obj.string];
      } else if (obj.type == "string") {
        base = "";
      } else if (obj.type == "atom") {
        base = 1;
      } else if (obj.type == "function") {
        if (window.jQuery != null && (obj.string == '$' || obj.string == 'jQuery') &&
          (typeof window.jQuery == 'function'))
          base = window.jQuery();
        else if (window._ != null && (obj.string == '_') && (typeof window._ == 'function'))
          base = window._();
      }
      while (base != null && context.length)
        base = base[context.pop().string];
      if (base != null) gatherCompletions(base);
    } else {
      // If not, just look in the window object and any local scope
      // (reading into JS mode internals to get at the local and global variables)

      forEach(keywords, maybeAdd);
    }

    return found.sort();

  }

  
  function getKeywords(editor) {
	    var mode = editor.doc.modeOption;
	    if (mode === "sql") mode = "text/x-sql";
	    return CodeMirror.resolveMode(mode).keywords;
  }

  function getText(item) {
    return typeof item == "string" ? item : item.text;
  }

  function getItem(list, item) {
    if (!list.slice) return list[item];
    for (var i = list.length - 1; i >= 0; i--) if (getText(list[i]) == item)
      return list[i];
  }

  function shallowClone(object) {
    var result = {};
    for (var key in object) if (object.hasOwnProperty(key))
      result[key] = object[key];
    return result;
  }

  function match(string, word) {
    var len = string.length;
    var sub = getText(word).substr(0, len);
    return string.toUpperCase() === sub.toUpperCase();
  }

  function addMatches(result, search, wordlist, formatter) {
    for (var word in wordlist) {
      if (!wordlist.hasOwnProperty(word)) continue;
      if (wordlist.slice) word = wordlist[word];

      if (match(search, word)) result.push(formatter(word));
    }
  }

  function cleanName(name) {
    // Get rid name from backticks(`) and preceding dot(.)
    if (name.charAt(0) == ".") {
      name = name.substr(1);
    }
    return name.replace(/`/g, "");
  }

  function insertBackticks(name) {
    var nameParts = getText(name).split(".");
    for (var i = 0; i < nameParts.length; i++)
      nameParts[i] = "`" + nameParts[i] + "`";
    var escaped = nameParts.join(".");
    if (typeof name == "string") return escaped;
    name = shallowClone(name);
    name.text = escaped;
    return name;
  }

  function nameCompletion(cur, token, result, editor) {
    // Try to complete table, colunm names and return start position of completion
    var useBacktick = false;
    var nameParts = [];
    var start = token.start;
    var cont = true;
    while (cont) {
      cont = (token.string.charAt(0) == ".");
      useBacktick = useBacktick || (token.string.charAt(0) == "`");

      start = token.start;
      nameParts.unshift(cleanName(token.string));

      token = editor.getTokenAt(Pos(cur.line, token.start));
      if (token.string == ".") {
        cont = true;
        token = editor.getTokenAt(Pos(cur.line, token.start));
      }
    }

    // Try to complete table names
    var string = nameParts.join(".");
    addMatches(result, string, tables, function(w) {
      return useBacktick ? insertBackticks(w) : w;
    });

    // Try to complete columns from defaultTable
    addMatches(result, string, defaultTable, function(w) {
      return useBacktick ? insertBackticks(w) : w;
    });

    // Try to complete columns
    string = nameParts.pop();
    var table = nameParts.join(".");

    var alias = false;
    var aliasTable = table;
    // Check if table is available. If not, find table by Alias
    if (!getItem(tables, table)) {
      var oldTable = table;
      table = findTableByAlias(table, editor);
      if (table !== oldTable) alias = true;
    }

    return table;
  }

  function eachWord(lineText, f) {
    if (!lineText) return;
    var excepted = /[,;]/g;
    var words = lineText.split(" ");
    for (var i = 0; i < words.length; i++) {
      f(words[i]?words[i].replace(excepted, '') : '');
    }
  }

  function convertCurToNumber(cur) {
    // max characters of a line is 999,999.
    return cur.line + cur.ch / Math.pow(10, 6);
  }

  function convertNumberToCur(num) {
    return Pos(Math.floor(num), +num.toString().split('.').pop());
  }
  
	  
  var Pos = CodeMirror.Pos;
  var tables;
  var defaultTable;
  var keywords;
  var CONS = {
    QUERY_DIV: ";",
	ALIAS_KEYWORD: "AS"
  };
	  
	  
  function findTableByAlias(alias, editor) {
    var doc = editor.doc;
    var fullQuery = doc.getValue();
    var aliasUpperCase = alias.toUpperCase();
    var previousWord = "";
    var table = "";
    var separator = [];
    var validRange = {
      start: Pos(0, 0),
      end: Pos(editor.lastLine(), editor.getLineHandle(editor.lastLine()).length)
    };

    //add separator
    var indexOfSeparator = fullQuery.indexOf(CONS.QUERY_DIV);
    while(indexOfSeparator != -1) {
      separator.push(doc.posFromIndex(indexOfSeparator));
      indexOfSeparator = fullQuery.indexOf(CONS.QUERY_DIV, indexOfSeparator+1);
    }
    separator.unshift(Pos(0, 0));
    separator.push(Pos(editor.lastLine(), editor.getLineHandle(editor.lastLine()).text.length));

    //find valid range
    var prevItem = 0;
    var current = convertCurToNumber(editor.getCursor());
    for (var i=0; i< separator.length; i++) {
      var _v = convertCurToNumber(separator[i]);
      if (current > prevItem && current <= _v) {
        validRange = { start: convertNumberToCur(prevItem), end: convertNumberToCur(_v) };
        break;
      }
      prevItem = _v;
    }

    var query = doc.getRange(validRange.start, validRange.end, false);
    var prev;
    for (var i = 0; i < query.length; i++) {
      var lineText = query[i];
      eachWord(lineText, function(word) {
        var wordUpperCase = word.toUpperCase();
    
	        if (wordUpperCase === aliasUpperCase && prev.toUpperCase()==CONS.ALIAS_KEYWORD.toUpperCase()){
	          table = previousWord;
	        }
	        
	        prev = word;
	        if (wordUpperCase !== CONS.ALIAS_KEYWORD){
	          previousWord = word;
	        } 
	      });
	      if (table) break;
	    }
	    return table;
	  }
  
	function aliasSearch(editor, keywords, getToken, options){
	  tables = (options && options.tables) || {};
	  var defaultTableName = options && options.defaultTable;
	  defaultTable = defaultTableName && getItem(tables, defaultTableName);
	  keywords = keywords || getKeywords(editor);
	  table = null;
	  
	  if (defaultTableName && !defaultTable)
	    defaultTable = findTableByAlias(defaultTableName, editor);
	
	  defaultTable = defaultTable || [];
	
	  if (defaultTable.columns)
	    defaultTable = defaultTable.columns;
	
	  var cur = editor.getCursor();
	  var result = [];
	  var token = editor.getTokenAt(cur), start, end, search;
	  if (token.end > cur.ch) {
	    token.end = cur.ch;
	    token.string = token.string.slice(0, cur.ch - token.start);
	  }
	
	  if (token.string.match(/^[.`\w@]\w*$/)) {
	    search = token.string;
	    start = token.start;
	    end = token.end;
	  } else {
	    start = end = cur.ch;
	    search = "";
	  }
	  if (search.charAt(0) == "." || search.charAt(0) == "`") {
	    table = nameCompletion(cur, token, result, editor);
	  } 
	  
	  return table; 
	}
	
	
  function scriptHint(editor, keywords, getToken, options) {
    // Find the token at the cursor
    var cur = editor.getCursor(),
    token = getToken(editor, cur),
    tprop = token;
    var optional_keyword = null;

    var aliasTable = aliasSearch(editor, keywords, getToken, options);
    // If it's not a 'word-style' token, ignore the token.
    if (!/^[\w$_]*$/.test(token.string)) {
      token = tprop = {
        start: cur.ch,
        end: cur.ch,
        string: "",
        state: token.state,
        type: token.string == "." ? "property" : null
      };
    }
    
    token_start_original = token.start;
    token_end_original = token.end;
    line_original = cur.line;

    cur_temp = {}
    cur_temp.line=cur.line;
    cur_temp.ch=token.start;
    token_temp = getToken(editor, cur_temp);

    
    if ( token_temp.string=="."){
      optional_keyword = token.string;
      token = tprop = {
        start: cur_temp.ch,
        end: cur_temp.ch,
        string: "",
        state: token_temp,
        type: token_temp.string == "." ? "property" : null
      };   

    }
    
    // If it is a property, find out what it is a property of.
    while (tprop.type == "property") {
      tprop = getToken(editor, {
        line: cur.line,
        ch: tprop.start
      })
       
      if (editor.servicemode.toLowerCase() == "gwt") {
    	   
          tableProp = getToken(editor, {
              line: cur.line,
              ch: tprop.start
            });
          
          tempProp = getToken(editor, {
              line: cur.line,
              ch: tableProp.start
            });
          
	      if (tempProp.string.trim()=="."){
	    	  
	    	  schemaProp = getToken(editor, {
	              line: cur.line,
	              ch: tableProp.start-1
	            });
	    	  
	    	  if (schemaProp.string){
	    		  optional_keyword = schemaProp.string  + "." + tableProp.string + "." + optional_keyword;	          
	    	  }
	    	  
	    	  if (aliasTable)  optional_keyword = aliasTable + "." + optional_keyword;	
	          
	      } else {

	    	  if (aliasTable){
	    		  optional_keyword = aliasTable + "." + optional_keyword;
	    	  } else {
		    	  optional_keyword = tableProp.string + "." + optional_keyword;

	    	  }

	      }
	      
      }

      if (tprop.string != ".") return;
      tprop = getToken(editor, {
        line: cur.line,
        ch: tprop.start
      });
      if (tprop.string == ')') {
        var level = 1;
        do {
          tprop = getToken(editor, {
            line: cur.line,
            ch: tprop.start
          });
          switch (tprop.string) {
            case ')':
              level++;
              break;
            case '(':
              level--;
              break;
            default:
              break;
          }
        } while (level > 0);
        tprop = getToken(editor, {
          line: cur.line,
          ch: tprop.start
        });
        if (tprop.type.indexOf("variable") === 0)
          tprop.type = "function";
        else return; // no clue
      }
      if (!context) var context = [];

      context.push(tprop);

    }

    if (editor.servicemode.toLowerCase() == "gwt") {
    	if (!optional_keyword){
    		if (token.string){
    			optional_keyword = token.string;
    		}
    	}
    }
    
    
    if (editor.servicemode.toLowerCase() != "tap") {
      if (editor.servicemode.toLowerCase() == "jsontree") {
        return {
          list: getCompletionsJsontree(token, context, keywords, options, editor, optional_keyword),
          from: {
            line: line_original,
            ch: token_start_original
          },
          to: {
            line: line_original,
            ch: token_end_original
          }
        };
      } else if (editor.servicemode.toLowerCase() == "gwt") {
            return {
              list: getCompletionsGWT(token, context, keywords, options, editor, optional_keyword),
              from: {
                line: line_original,
                ch: token_start_original
              },
              to: {
                line: line_original,
                ch: token_end_original
              }
            };

      }  else if (editor.servicemode.toLowerCase() == "tapjs") {
            return {
              list: getCompletionsTapJs(token, context, keywords, options, editor, optional_keyword),
              from: {
                line: line_original,
                ch: token_start_original
              },
              to: {
                line: line_original,
                ch: token_end_original
              }
            };

      } else {
        return {
          list: getCompletions(token, context, keywords, options),
          from: {
            line: line_original,
            ch: token_start_original
          },
          to: {
            line: line_original,
            ch: token_end_original
          }
        };
      }


    } else {

      return {

        list: getCompletionsAdql(token, context, keywords, options, editor, optional_keyword),
        from: {
          line: line_original,
          ch: token_start_original
        },
        to: {
          line: line_original,
          ch: token_end_original
        }
      };
    }

  }

  CodeMirror.adqlHint = function(editor, options) {
    return scriptHint(editor, editor.availableTags,
      function(e, cur) {
        return e.getTokenAt(cur);
      },
      options);
  };
 

})();
