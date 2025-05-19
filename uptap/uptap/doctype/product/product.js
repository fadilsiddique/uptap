// Copyright (c) 2025, Upscape Technologies and contributors
// For license information, please see license.txt

frappe.ui.form.on("Product", {
    refresh(frm) {
        if (frm.doc.has_variant) {
            frm.add_custom_button(__('Create Variant'), function () {
                create_variant_dialog(frm);
            });



        }
        if (frm.doc.product_type === 'Variant') {
            frm.set_df_property('has_variant', 'hidden', 1);
        }
        // frm.add_custom_button(__('Create Variant'), function () {
        //     create_variant_dialog(frm);
        // });

        // if (frm.doc.product_type === 'Variant') {
        //     frm.set_df_property('has_variant', 'hidden', 1);
        // }

    },
});

function create_variant_dialog(frm) {
    // Fetch Item Attributes
    frappe.call({
        method: 'frappe.client.get_list',
        args: {
            doctype: 'Product Attribute',
            fields: ['name', 'attribute_name'],
        },
        callback: function (r) {
            if (r.message) {
                let attributes = r.message;
                let fields = [];

                // Create dialog fields dynamically
                attributes.forEach(attr => {
                    // Fetch attribute values for each attribute
                    frappe.call({
                        method: 'frappe.client.get',
                        args: {
                            doctype: 'Product Attribute',
                            name: attr.name
                        },
                        async: false,
                        callback: function (response) {
                            if (response.message) {
                                let values = response.message.product_attribute_values.map(val => val.attribute_value);
                                fields.push({
                                    label: attr.attribute_name,
                                    fieldname: frappe.scrub(attr.attribute_name),
                                    fieldtype: 'Select',
                                    options: values,
                                    reqd: 1
                                });
                            }
                        }
                    });
                });

                // Create dialog
                let dialog = new frappe.ui.Dialog({
                    title: __('Create Variant'),
                    fields: fields,
                    primary_action_label: __('Create'),
                    primary_action: function (values) {
                        create_variant_item(frm, values, attributes);
                        dialog.hide();
                    }
                });

                dialog.show();
            }
        }
    });
}

function create_variant_item(frm, dialog_values, attributes) {
    // Get attribute abbreviations
    let abbreviations = [];

    attributes.forEach(attr => {
        frappe.call({
            method: 'frappe.client.get',
            args: {
                doctype: 'Product Attribute',
                name: attr.name
            },
            async: false,
            callback: function (response) {
                if (response.message) {
                    let selected_value = dialog_values[frappe.scrub(attr.attribute_name)];
                    let attr_value = response.message.product_attribute_values.find(val => val.attribute_value === selected_value);
                    if (attr_value && attr_value.abbr) {
                        abbreviations.push(attr_value.abbr);
                    }
                }
            }
        });
    });

    // Generate new item code
    let new_item_code = frm.doc.pppccc + '-' + abbreviations.join('-');

    // Prepare variant data
    let variant_data = {
        doctype: 'Product',
        pppccc: new_item_code,
        ppnn: frm.doc.ppnn + '-' + abbreviations.join(' '),
        variant_of: frm.doc.name,
        product_type: 'Variant',
    };

    // Copy parent fields to variant
    let fields_to_copy = [
        'category',
        'brand',
        'description',
        'uom',
        // Add other fields you want to copy from parent
    ];

    fields_to_copy.forEach(field => {
        if (frm.doc[field]) {
            variant_data[field] = frm.doc[field];
        }
    });

    // Redirect to new item form with pre-filled values
    frappe.new_doc('Product', variant_data);
}
