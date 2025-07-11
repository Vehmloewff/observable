import { useEffect, useMemo, useState } from "react";

export type Subscription<T> = (value: T) => void;

export type Observable<T> = {
	get(): T;
	subscribe(subscription: Subscription<T>): () => void;
};

export class OwnedObservable<T> implements Observable<T> {
	#value: T;
	#subscriptions: Subscription<T>[] = [];
	#leases: ObservableLease[] = [];

	#isLocked = false;
	#locksAquiring: (() => void)[] = [];

	constructor(initialValue: T) {
		this.#value = initialValue;
	}

	set(newValue: T) {
		this.#value = newValue;

		for (const subscription of this.#subscriptions) subscription(newValue);
		for (const lease of this.#leases) lease.expire();

		this.#leases = [];
	}

	update(fn: (value: T) => T) {
		this.set(fn(this.#value));
	}

	get(): T {
		return this.#value;
	}

	subscribe(subscription: Subscription<T>): () => void {
		subscription(this.#value);

		this.#subscriptions.push(subscription);

		return () => {
			this.#subscriptions.splice(
				this.#subscriptions.indexOf(subscription),
				1,
			);
		};
	}

	map<N>(mapper: (value: T) => N): Observable<N> {
		return new MappedObservable(this, mapper);
	}

	lease(): ObservableLease {
		const lease = new ObservableLease();
		this.#leases.push(lease);

		return lease;
	}

	async lock(): Promise<[T, (newValue: T) => void]> {
		const release = (newValue: T) => {
			this.set(newValue);

			this.#locksAquiring.shift()?.();
		};

		if (!this.#isLocked) {
			this.#isLocked = true;

			return [this.#value, release];
		}

		await new Promise<void>((resolve) => this.#locksAquiring.push(resolve));

		return [this.#value, release];
	}
}

export class ObservableLease {
	#expired = false;

	expire() {
		this.#expired = true;
	}

	isExpired(): boolean {
		return this.#expired;
	}
}

export class MappedObservable<T, N> implements Observable<N> {
	#observable: Observable<T>;
	#mapper: (value: T) => N;

	constructor(observable: Observable<T>, mapper: (value: T) => N) {
		this.#observable = observable;
		this.#mapper = mapper;
	}

	get() {
		return this.#mapper(this.#observable.get());
	}

	subscribe(subscription: Subscription<N>) {
		subscription(this.#mapper(this.#observable.get()));

		const unsubscribe = this.#observable.subscribe((value) => {
			subscription(this.#mapper(value));
		});

		return () => unsubscribe();
	}
}

export function useObservable<T>(observable: Observable<T>): T {
	const [value, setValue] = useState(observable.get());

	useEffect(
		() => observable.subscribe((value) => setValue(value)),
		[setValue, observable],
	);

	return value;
}

export function useObservableMemo<T>(
	factory: () => Observable<T>,
	dependencies: unknown[],
): T {
	const observable = useMemo(factory, dependencies);
	return useObservable(observable);
}
