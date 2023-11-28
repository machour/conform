import { type Intent, INTENT, serializeIntents } from '@conform-to/dom';
import type { CSSProperties, HTMLInputTypeAttribute } from 'react';
import type {
	FormMetadata,
	FieldMetadata,
	Metadata,
	Pretty,
	Primitive,
	FieldProps,
} from './context';

type FormControlProps = {
	id: string;
	name: string;
	form: string;
	required?: boolean;
	autoFocus?: boolean;
	tabIndex?: number;
	style?: CSSProperties;
	'aria-describedby'?: string;
	'aria-invalid'?: boolean;
	'aria-hidden'?: boolean;
};

type InputProps = Pretty<
	FormControlProps & {
		type?: Exclude<HTMLInputTypeAttribute, 'submit' | 'reset' | 'button'>;
		minLength?: number;
		maxLength?: number;
		min?: string | number;
		max?: string | number;
		step?: string | number;
		pattern?: string;
		multiple?: boolean;
		value?: string;
		defaultChecked?: boolean;
		defaultValue?: string;
	}
>;

type SelectProps = Pretty<
	FormControlProps & {
		defaultValue?: string | number | readonly string[] | undefined;
		multiple?: boolean;
	}
>;

type TextareaProps = Pretty<
	FormControlProps & {
		minLength?: number;
		maxLength?: number;
		defaultValue?: string;
	}
>;

type AriaOptions =
	| {
			ariaAttributes?: true;
			description?: boolean;
	  }
	| {
			ariaAttributes: false;
	  };

type InputOptions = AriaOptions &
	(
		| {
				type: 'checkbox' | 'radio';
				value?: string;
		  }
		| {
				type?: Exclude<HTMLInputTypeAttribute, 'button' | 'submit' | 'hidden'>;
				value?: never;
		  }
	);

/**
 * Cleanup `undefined` from the dervied props
 * To minimize conflicts when merging with user defined props
 */
function simplify<Props>(props: Props): Props {
	for (const key in props) {
		if (props[key] === undefined) {
			delete props[key];
		}
	}

	return props;
}

function getAriaAttributes(
	metadata: Metadata<unknown, unknown>,
	options: AriaOptions = {},
): {
	'aria-invalid'?: boolean;
	'aria-describedby'?: string;
} {
	if (
		typeof options.ariaAttributes !== 'undefined' &&
		!options.ariaAttributes
	) {
		return {};
	}

	return simplify({
		'aria-invalid': !metadata.valid || undefined,
		'aria-describedby': metadata.valid
			? options.description
				? metadata.descriptionId
				: undefined
			: `${metadata.errorId} ${
					options.description ? metadata.descriptionId : ''
			  }`.trim(),
	});
}

function getFormControlProps<Schema>(
	metadata: FieldMetadata<Schema, unknown>,
	options?: AriaOptions,
) {
	return simplify({
		id: metadata.id,
		name: metadata.name,
		form: metadata.formId,
		required: metadata.constraint?.required || undefined,
		autoFocus: !metadata.valid || undefined,
		...getAriaAttributes(metadata, options),
	});
}

export function getInputProps<
	Schema extends Exclude<Primitive, File> | unknown,
>(field: FieldMetadata<Schema, unknown>, options?: InputOptions): InputProps;
export function getInputProps<Schema extends File | File[]>(
	field: FieldMetadata<Schema, unknown>,
	options: InputOptions & { type: 'file' },
): InputProps;
export function getInputProps<Schema extends Primitive | File[] | unknown>(
	field: FieldMetadata<Schema, unknown>,
	options: InputOptions = {},
): InputProps {
	const props: InputProps = {
		...getFormControlProps(field, options),
		type: options.type,
		minLength: field.constraint?.minLength,
		maxLength: field.constraint?.maxLength,
		min: field.constraint?.min,
		max: field.constraint?.max,
		step: field.constraint?.step,
		pattern: field.constraint?.pattern,
		multiple: field.constraint?.multiple,
	};

	if (options.type === 'checkbox' || options.type === 'radio') {
		props.value = options.value ?? 'on';
		props.defaultChecked =
			typeof field.initialValue === 'boolean'
				? field.initialValue
				: field.initialValue === props.value;
	} else if (options.type !== 'file') {
		props.defaultValue = field.initialValue?.toString();
	}

	return simplify(props);
}

export function getSelectProps<
	Schema extends Primitive | Primitive[] | undefined | unknown,
>(
	metadata: FieldMetadata<Schema, unknown>,
	options?: AriaOptions,
): SelectProps {
	return simplify({
		...getFormControlProps(metadata, options),
		defaultValue: metadata.initialValue?.toString(),
		multiple: metadata.constraint?.multiple,
	});
}

export function getTextareaProps<
	Schema extends Primitive | undefined | unknown,
>(
	metadata: FieldMetadata<Schema, unknown>,
	options?: AriaOptions,
): TextareaProps {
	return simplify({
		...getFormControlProps(metadata, options),
		defaultValue: metadata.initialValue?.toString(),
		minLength: metadata.constraint?.minLength,
		maxLength: metadata.constraint?.maxLength,
	});
}

export function getFormProps<Schema extends Record<string, any>>(
	metadata: FormMetadata<Schema, any>,
	options?: AriaOptions,
) {
	return simplify({
		id: metadata.id,
		onSubmit: metadata.onSubmit,
		noValidate: metadata.noValidate,
		...getAriaAttributes(metadata, options),
	});
}

export function getFieldsetProps<
	Schema extends Record<string, any> | undefined | unknown,
>(metadata: FieldMetadata<Schema, unknown>, options?: AriaOptions) {
	return simplify({
		id: metadata.id,
		name: metadata.name,
		form: metadata.formId,
		...getAriaAttributes(metadata, options),
	});
}

export function getFieldProps<Schema, Error>(
	metadata: FieldMetadata<Schema, Error>,
): FieldProps<Schema, Error> {
	return {
		name: metadata.name,
		formId: metadata.formId,
	};
}

export function getCollectionProps<
	Schema extends
		| Array<string | boolean>
		| string
		| boolean
		| undefined
		| unknown,
>(
	metadata: FieldMetadata<Schema, unknown>,
	options: AriaOptions & {
		type: 'checkbox' | 'radio';
		options: string[];
	},
): Array<InputProps & Pick<Required<InputProps>, 'type' | 'value'>> {
	return options.options.map((value) =>
		simplify({
			...getFormControlProps(metadata, options),
			id: `${metadata.id}-${value}`,
			type: options.type,
			value,
			defaultChecked:
				options.type === 'checkbox' && Array.isArray(metadata.initialValue)
					? metadata.initialValue.includes(value)
					: metadata.initialValue === value,

			// The required attribute doesn't make sense for checkbox group
			// As it would require all checkboxes to be checked instead of at least one
			// It is overriden with `undefiend` so it could be cleaned upW properly
			required:
				options.type === 'checkbox' ? undefined : metadata.constraint?.required,
		}),
	);
}

export function getControlButtonProps(formId: string, intents: Array<Intent>) {
	return {
		name: INTENT,
		value: serializeIntents(intents),
		form: formId,
		formNoValidate: true,
	};
}
