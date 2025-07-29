# observable

A simple abstraction that allows for the creation of observable values.

## Usage

```ts
import { OwnedObservable } from '@emooring/observable';

const counter = new OwnedObservable(0);

const unsubscribe = counter.subscribe((value) => {
  console.log(`Counter value: ${value}`);
});


counter.get(); // 0
counter.set(1); // logs: Counter value: 1

counter.set(1); // Even though value is the same, another event is triggered. Logs: Counter value: 1

unsubscribe();

counter.set(2); // does not log anything because we have unsubscribed

function SomeReactComponent() {
	const value = useObservable(counter)

	console.log(value) // logs: 2
}
```
