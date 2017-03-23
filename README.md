# Tap-autocomplete
Autocomplete library, wrapped in GWT sample project, that allows dynamic metadata keyword loading from TAP services 

The research leading to these results has received funding from the European Community's Seventh Framework Programme (FP7-SPACE-2013-1) under grant agreement n°606740.

# Usage Example:  

Javascript:

<pre>

var params = { <br>     
    textfieldid: "textfield",<br>
    tap_resource: 'http://tap_service', <br>
    servicemode: "tapjs"<br>,
    initial_catalogues: ["name"]
} 

var autocompleteInstance = new TapAutocomplete(params);

</pre>


HTML:  

    <table align="center">
      <tr>
        <td colspan="2" style="font-weight:bold;">Please enter your query:</td>        
      </tr>
      <tr>
        <td id="nameFieldContainer"><textarea id="textfield" class="gwt-TextArea"></textarea></td>
        <td id="sendButtonContainer"></td>
      </tr>
      <tr>
        <td colspan="2" style="color:red;" id="errorLabelContainer"></td>
      </tr>
    </table>
    
    

